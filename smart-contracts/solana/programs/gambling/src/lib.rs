use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("GambLE1111111111111111111111111111111111111");

#[program]
pub mod gambling {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, house_edge: u16) -> Result<()> {
        let gambling_state = &mut ctx.accounts.gambling_state;
        gambling_state.authority = ctx.accounts.authority.key();
        gambling_state.house_edge = house_edge;
        gambling_state.total_volume = 0;
        gambling_state.total_profit = 0;
        gambling_state.is_active = true;
        gambling_state.bump = *ctx.bumps.get("gambling_state").unwrap();

        Ok(())
    }

    pub fn play_dice(
        ctx: Context<PlayDice>,
        bet_amount: u64,
        prediction: u8,
        nonce: u64,
    ) -> Result<()> {
        require!(prediction > 0 && prediction < 100, ErrorCode::InvalidPrediction);
        require!(bet_amount > 0, ErrorCode::InvalidBetAmount);
        require!(ctx.accounts.gambling_state.is_active, ErrorCode::GamblingInactive);

        let gambling_state = &mut ctx.accounts.gambling_state;

        // Generate pseudo-random number using recent slot hash and nonce
        let recent_slothash = &ctx.accounts.recent_slothash;
        let seed = [
            recent_slothash.data.borrow()[0..8].try_into().unwrap(),
            nonce.to_le_bytes(),
            ctx.accounts.player.key().to_bytes()[0..8].try_into().unwrap(),
        ].concat();

        let result = generate_random_u8(&seed) % 100 + 1;
        let won = result > prediction;

        // Calculate payout (including house edge)
        let payout = if won {
            let base_multiplier = 9900u64 / (100 - prediction as u64); // 99% base (1% house edge)
            let adjusted_multiplier = base_multiplier * (10000 - gambling_state.house_edge as u64) / 10000;
            bet_amount * adjusted_multiplier / 100
        } else {
            0
        };

        // Transfer tokens
        if won && payout > 0 {
            let seeds = &[
                b"gambling_state",
                &[gambling_state.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.house_token_account.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: gambling_state.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            token::transfer(cpi_ctx, payout)?;
        } else {
            // House wins, transfer bet to house
            let cpi_accounts = Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_token_account.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token::transfer(cpi_ctx, bet_amount)?;
        }

        // Update statistics
        gambling_state.total_volume += bet_amount;
        if !won {
            gambling_state.total_profit += bet_amount;
        }

        // Emit event
        emit!(DiceGameResult {
            player: ctx.accounts.player.key(),
            bet_amount,
            prediction,
            result,
            won,
            payout,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn play_crash(
        ctx: Context<PlayCrash>,
        bet_amount: u64,
        cash_out_multiplier: u64,
        nonce: u64,
    ) -> Result<()> {
        require!(bet_amount > 0, ErrorCode::InvalidBetAmount);
        require!(cash_out_multiplier >= 100, ErrorCode::InvalidMultiplier); // Min 1.00x
        require!(ctx.accounts.gambling_state.is_active, ErrorCode::GamblingInactive);

        let gambling_state = &mut ctx.accounts.gambling_state;

        // Generate crash point
        let recent_slothash = &ctx.accounts.recent_slothash;
        let seed = [
            recent_slothash.data.borrow()[8..16].try_into().unwrap(),
            nonce.to_le_bytes(),
            ctx.accounts.player.key().to_bytes()[8..16].try_into().unwrap(),
        ].concat();

        let crash_multiplier = generate_crash_multiplier(&seed, gambling_state.house_edge);
        let won = cash_out_multiplier <= crash_multiplier;

        // Calculate payout
        let payout = if won {
            bet_amount * cash_out_multiplier / 100
        } else {
            0
        };

        // Transfer tokens
        if won && payout > 0 {
            let seeds = &[
                b"gambling_state",
                &[gambling_state.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.house_token_account.to_account_info(),
                to: ctx.accounts.player_token_account.to_account_info(),
                authority: gambling_state.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            token::transfer(cpi_ctx, payout)?;
        } else {
            // House wins
            let cpi_accounts = Transfer {
                from: ctx.accounts.player_token_account.to_account_info(),
                to: ctx.accounts.house_token_account.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token::transfer(cpi_ctx, bet_amount)?;
        }

        // Update statistics
        gambling_state.total_volume += bet_amount;
        if !won {
            gambling_state.total_profit += bet_amount;
        }

        // Emit event
        emit!(CrashGameResult {
            player: ctx.accounts.player.key(),
            bet_amount,
            cash_out_multiplier,
            crash_multiplier,
            won,
            payout,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn set_active(ctx: Context<SetActive>, active: bool) -> Result<()> {
        ctx.accounts.gambling_state.is_active = active;
        Ok(())
    }

    pub fn update_house_edge(ctx: Context<UpdateHouseEdge>, house_edge: u16) -> Result<()> {
        require!(house_edge <= 1000, ErrorCode::HouseEdgeTooHigh); // Max 10%
        ctx.accounts.gambling_state.house_edge = house_edge;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GamblingState::INIT_SPACE,
        seeds = [b"gambling_state"],
        bump
    )]
    pub gambling_state: Account<'info, GamblingState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlayDice<'info> {
    #[account(
        mut,
        seeds = [b"gambling_state"],
        bump = gambling_state.bump,
        has_one = authority
    )]
    pub gambling_state: Account<'info, GamblingState>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub house_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the recent slothash sysvar
    #[account(address = solana_program::sysvar::slot_hashes::id())]
    pub recent_slothash: AccountInfo<'info>,

    pub authority: SystemAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PlayCrash<'info> {
    #[account(
        mut,
        seeds = [b"gambling_state"],
        bump = gambling_state.bump,
        has_one = authority
    )]
    pub gambling_state: Account<'info, GamblingState>,

    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub house_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the recent slothash sysvar
    #[account(address = solana_program::sysvar::slot_hashes::id())]
    pub recent_slothash: AccountInfo<'info>,

    pub authority: SystemAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetActive<'info> {
    #[account(
        mut,
        seeds = [b"gambling_state"],
        bump = gambling_state.bump,
        has_one = authority
    )]
    pub gambling_state: Account<'info, GamblingState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateHouseEdge<'info> {
    #[account(
        mut,
        seeds = [b"gambling_state"],
        bump = gambling_state.bump,
        has_one = authority
    )]
    pub gambling_state: Account<'info, GamblingState>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct GamblingState {
    pub authority: Pubkey,
    pub house_edge: u16, // Basis points (100 = 1%)
    pub total_volume: u64,
    pub total_profit: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[event]
pub struct DiceGameResult {
    pub player: Pubkey,
    pub bet_amount: u64,
    pub prediction: u8,
    pub result: u8,
    pub won: bool,
    pub payout: u64,
    pub timestamp: i64,
}

#[event]
pub struct CrashGameResult {
    pub player: Pubkey,
    pub bet_amount: u64,
    pub cash_out_multiplier: u64,
    pub crash_multiplier: u64,
    pub won: bool,
    pub payout: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid prediction value")]
    InvalidPrediction,
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    #[msg("Invalid multiplier")]
    InvalidMultiplier,
    #[msg("Gambling is currently inactive")]
    GamblingInactive,
    #[msg("House edge too high")]
    HouseEdgeTooHigh,
}

// Helper functions
fn generate_random_u8(seed: &[u8]) -> u8 {
    use solana_program::keccak;
    let hash = keccak::hash(seed);
    hash.to_bytes()[0]
}

fn generate_crash_multiplier(seed: &[u8], house_edge: u16) -> u64 {
    use solana_program::keccak;
    let hash = keccak::hash(seed);
    let random_bytes = u32::from_le_bytes([hash.to_bytes()[0], hash.to_bytes()[1], hash.to_bytes()[2], hash.to_bytes()[3]]);

    // Generate crash point with house edge consideration
    // This implements a simplified crash algorithm
    let base_multiplier = 100 + (random_bytes % 1900); // 1.00x to 20.00x
    let adjusted_multiplier = base_multiplier * (10000 - house_edge as u32) / 10000;

    adjusted_multiplier as u64
}
