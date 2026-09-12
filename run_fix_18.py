import re

with open('contracts/ArcPerpVault.sol', 'r', encoding='utf-8') as f:
    text = f.read()

# Add limitOrderMargin mapping
mapping_addition = """    // Mapping from user address to their locked margin
    mapping(address => uint256) public lockedMargin;
    // Mapping from user address to their limit order margin
    mapping(address => uint256) public limitOrderMargin;"""

text = text.replace("    // Mapping from user address to their locked margin\n    mapping(address => uint256) public lockedMargin;", mapping_addition)

# Fix placeLimitOrder
place_limit = """        userCollateral[msg.sender] -= marginRequired;
        limitOrderMargin[msg.sender] += marginRequired;"""
text = text.replace("        userCollateral[msg.sender] -= marginRequired;\n        lockedMargin[msg.sender] += marginRequired;", place_limit, 1) # Only replace the 2nd occurrence which is in placeLimitOrder, wait! Let's be exact.

