import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def create_pdf(filename="Arc_Terminal_FAQ_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#01C38E")    # Emerald Green
    SECONDARY = colors.HexColor("#0052FF")  # Arc Blue
    DARK_BG = colors.HexColor("#0F172A")    # Slate Dark
    TEXT_DARK = colors.HexColor("#1E293B")  # Deep Charcoal
    TEXT_MUTED = colors.HexColor("#64748B") # Muted Gray
    ACCENT_BG = colors.HexColor("#F8FAFC")  # Light Gray Card
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=TA_LEFT
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=TEXT_MUTED,
        alignment=TA_LEFT
    )

    category_style = ParagraphStyle(
        'CategoryHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=SECONDARY,
        spaceBefore=14,
        spaceAfter=6
    )

    q_style = ParagraphStyle(
        'QuestionStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=TEXT_DARK,
        spaceBefore=10,
        spaceAfter=4
    )

    a_style = ParagraphStyle(
        'AnswerStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceBefore=2,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        spaceAfter=3
    )

    tag_style = ParagraphStyle(
        'TagStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER
    )

    story = []

    # Header Banner
    story.append(Paragraph("ARC TERMINAL", title_style))
    story.append(Paragraph("Official FAQ & Architecture Guide • Investor & Technical Reference", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=15))

    faq_sections = [
        {
            "category": "1. Liquidity & Trading Infrastructure",
            "questions": [
                {
                    "q": "Q1: Which liquidity infrastructure do we use for Spot Swaps?",
                    "a": "Arc Terminal routes all spot swaps through <b>Synthra V3</b> (a Concentrated Liquidity / Uniswap V3-style AMM fork deployed on Arc Network). Swaps interact directly with the SwapRouter contract (<code>0xA545bCB1...</code>), accessing on-chain pools for USDC, USDT, EURC, and cirBTC with fee tiers ranging from 0.05% (500) to 1.0% (10000)."
                },
                {
                    "q": "Q2: How are Perpetuals collateralized and traded with 100x leverage?",
                    "a": "Perpetual trading operates on a <b>Vault & Multi-Asset Liquidity Pool (LP)</b> model (similar to GMX / Synthetix). The platform's <b>Yield Vaults (USDC & EURC)</b> act as the counterparty for all leveraged positions, providing deep liquidity, instant execution, and zero price impact for trades up to 100x leverage."
                },
                {
                    "q": "Q3: How are index prices calculated for BTC, ETH, and SOL perpetuals?",
                    "a": "Index prices are fetched via real-time decentralized price feeds and Oracle index aggregation. This prevents local orderbook manipulation and ensures positions are settled against true global spot market prices."
                }
            ]
        },
        {
            "category": "2. Yield Vaults & APY Mechanics",
            "questions": [
                {
                    "q": "Q4: How do the USDC and EURC Vaults generate 4.5% - 5.0% APY?",
                    "a": "Yield is <b>100% Real Yield</b> derived from organic protocol revenue, not inflationary token emissions. Revenue is pooled from 3 primary sources:",
                    "bullets": [
                        "<b>Perpetual Trading & Leverage Fees:</b> Position opening/closing fees, trader borrowing interest (funding rates), and liquidation fees.",
                        "<b>Concentrated AMM Swap Fees:</b> A portion of vault capital supplies liquidity to high-volume stablecoin pools (e.g. USDC-EURC), capturing swap fees.",
                        "<b>Autocompounding ERC-4626 Vault Shares:</b> Yield is automatically reinvested into the vault's total assets, increasing share value (aUSDC / aEURC)."
                    ]
                },
                {
                    "q": "Q5: What smart contract standard do the Yield Vaults follow?",
                    "a": "The vaults implement the industry-standard <b>ERC-4626 Tokenized Vault Standard</b>. Depositing USDC yields <code>aUSDC</code> shares, and depositing EURC yields <code>aEURC</code> shares. Shares represent proportional ownership of the vault's growing asset pool."
                },
                {
                    "q": "Q6: Is the 5% APY guaranteed or dynamic?",
                    "a": "The APY is dynamic and auto-calculated based on rolling 7-day protocol fee generation and total vault deposits (TVL). During high market activity, APY can exceed 5.0% due to elevated trading and liquidation volume."
                }
            ]
        },
        {
            "category": "3. AI Agent & Natural Language Interface",
            "questions": [
                {
                    "q": "Q7: How does the AI Agent execute trades via chat prompts?",
                    "a": "The Agentic Interface uses a custom Intent Parsing LLM engine. When a user types a command like <code>/swap 10 USDC to EURC</code>, the AI parses the parameters, calculates optimal routing, constructs the exact Web3 ABI payload, and prepares the transaction for one-click wallet signature."
                },
                {
                    "q": "Q8: Is the AI Agent custodial or non-custodial?",
                    "a": "Arc Terminal is <b>100% non-custodial</b>. The AI agent never holds user private keys or funds. Every transaction generated by the AI requires explicit cryptographic approval from the user's connected wallet (MetaMask, Rabby, Coinbase Wallet, etc.)."
                }
            ]
        },
        {
            "category": "4. Technical Resilience & RPC Architecture",
            "questions": [
                {
                    "q": "Q9: What is the Direct RPC Failover Architecture?",
                    "a": "To prevent read timeouts commonly caused by browser extension RPC bridges (like MetaMask), Arc Terminal queries blockchain data directly via an optimized RPC client (<code>rpc.testnet.arc.network</code>) equipped with 3x retry logic, 5-second request timeouts, and exponential backoff."
                },
                {
                    "q": "Q10: Which wallets are supported?",
                    "a": "Arc Terminal supports all EVM-compatible wallets including <b>MetaMask, Rabby, Coinbase Wallet, Trust Wallet, and WalletConnect</b>. Read queries remain wallet-agnostic, while write operations seamlessly bridge to any connected provider."
                },
                {
                    "q": "Q11: Why is Arc Network ideal for this platform?",
                    "a": "Arc Network offers native stablecoin settlement, near-zero gas fees, sub-second finality, and dedicated financial primitives — making it the optimal chain for high-frequency agentic trading and yield optimization."
                }
            ]
        }
    ]

    for section in faq_sections:
        story.append(Paragraph(section["category"], category_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=SECONDARY, spaceAfter=8))

        for item in section["questions"]:
            q_p = Paragraph(item["q"], q_style)
            a_p = Paragraph(item["a"], a_style)
            
            elements = [q_p, a_p]
            
            if "bullets" in item:
                for b in item["bullets"]:
                    elements.append(Paragraph(f"• {b}", bullet_style))
            
            story.append(KeepTogether(elements))
            story.append(Spacer(1, 4))

    # Build PDF
    doc.build(story)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    create_pdf()
