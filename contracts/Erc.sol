// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    /// @notice Returns the name of the token
    function name() external view returns (string memory);

    /// @notice Returns the symbol of the token
    function symbol() external view returns (string memory);

    /// @notice Returns the number of decimals the token uses
    function decimals() external pure returns (uint8);

    /// @notice Returns the total token supply
    function totalSupply() external view returns (uint);

    /// @notice Returns the account balance of another account with address _owner
    function balanceOf(address account) external view returns (uint);

    /// @notice Transfers _value amount of tokens to address _to
    function transfer(address to, uint amount) external returns (bool success);

    /// @notice Returns the amount which _spender is still allowed to withdraw from _owner
    function allowance(address owner, address spender) external view returns (uint);

    /// @notice Allows _spender to withdraw from your account multiple times, up to the _value amount
    function approve(address spender, uint amount) external returns (bool success);

    /// @notice Transfers _value amount of tokens from address _from to address _to
    function transferFrom(
        address sender,
        address recipient,
        uint amount
    ) external returns (bool success);

    /// @notice Triggered when tokens are transferred, including zero value transfers
    event Transfer(address indexed from, address indexed to, uint amount);

    /// @notice Triggered whenever approve(address _spender, uint256 _value) is called
    event Approval(address indexed owner, address indexed to, uint amount);
}

contract ERC20 is IERC20, Ownable {
    uint totalTokens;
    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowances;

    error ZeroAddress();
    error InsufficientFunds();
    error InsufficientFundsAllowance();

    /// @dev Initializes the contract with an initial supply of tokens
    /// @param initialSupply The initial amount of tokens to mint
    constructor(uint initialSupply) Ownable() {
        mint(msg.sender, initialSupply);
    }

    /// @notice Modifier that checks if the sender has enough tokens
    modifier enoughTokens(address _from, uint _amount) {
        require(balanceOf(_from) >= _amount, "Not enough tokens.");
        _;
    }

    /// @notice Returns the name of the token
    function name() public pure returns (string memory) {
        return "DsnToken";
    }

    /// @notice Returns the symbol of the token
    function symbol() public pure returns (string memory) {
        return "DSN";
    }

    /// @notice Returns the number of decimals the token uses
    function decimals() public pure returns (uint8) {
        return 18;
    }

    /// @notice Returns the total token supply
    function totalSupply() public view returns (uint) {
        return totalTokens;
    }

    /// @notice Returns the account balance of a given account
    /// @param account The address of the account to query
    function balanceOf(address account) public view returns (uint) {
        return balances[account];
    }

    /// @notice Transfers tokens to a specified address
    /// @param to The address to transfer tokens to
    /// @param amount The amount of tokens to be transferred
    function transfer(address to, uint amount) external returns (bool) {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        if (amount > balances[msg.sender]) {
            revert InsufficientFunds();
        }

        balances[msg.sender] -= amount;
        balances[to] += amount;
        emit Transfer(msg.sender, to, amount);

        return true;
    }

    /// @notice Returns the remaining number of tokens that spender is allowed to spend
    /// @param owner The address of the token owner
    /// @param spender The address of the spender
    function allowance(address owner, address spender) external view returns (uint) {
        return allowances[owner][spender];
    }

    /// @notice Sets the amount of tokens that a spender is allowed to transfer on behalf of the token owner
    /// @param spender The address which will spend the funds
    /// @param amount The amount of tokens to be spent
    function approve(address spender, uint amount) external returns (bool) {
        if (spender == address(0)) {
            revert ZeroAddress();
        }

        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);

        return true;
    }

    /// @notice Transfers tokens from one address to another, using the allowance mechanism
    /// @param owner The address which you want to send tokens from
    /// @param recipient The address which you want to transfer to
    /// @param amount The amount of tokens to be transferred
    function transferFrom(
        address owner,
        address recipient,
        uint amount
    ) external enoughTokens(owner, amount) returns (bool) {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }

        if (allowances[owner][msg.sender] < amount) {
            revert InsufficientFundsAllowance();
        }

        allowances[owner][msg.sender] -= amount;
        balances[owner] -= amount;
        balances[recipient] += amount;
        emit Transfer(owner, recipient, amount);

        return true;
    }

    /// @notice Increases the amount of tokens that an owner allowed to a spender
    /// @param spender The address which will spend the funds
    /// @param addedValue The additional amount of tokens to be allowed for spending
    function increaseAllowance(address spender, uint addedValue) public {
        if (spender == address(0)) {
            revert ZeroAddress();
        }

        allowances[msg.sender][spender] += addedValue;

        emit Approval(msg.sender, spender, allowances[msg.sender][spender]);
    }

    /// @notice Decreases the amount of tokens that an owner allowed to a spender
    /// @param spender The address which will spend the funds
    /// @param subtractedValue The reduced amount of tokens to be allowed for spending
    function decreaseAllowance(address spender, uint subtractedValue) public {
        if (spender == address(0)) {
            revert ZeroAddress();
        }

        if(allowances[msg.sender][spender] < subtractedValue) {
            revert InsufficientFundsAllowance();
        }

        allowances[msg.sender][spender] -= subtractedValue;
        emit Approval(msg.sender, spender, allowances[msg.sender][spender]);
    }

    /// @notice Mints a specified amount of tokens and assigns them to the sender
    /// @param amount The amount of tokens to be minted
    function mint(address account, uint amount) public onlyOwner {
        if(account == address(0)) {
            revert ZeroAddress();
        }

        balances[account] += amount;
        totalTokens += amount;
        emit Transfer(address((0)), account, amount);
    }

    /// @notice Burns a specified amount of tokens from the sender
    /// @param amount The amount of tokens to be burned
    function burn(address account, uint amount) public onlyOwner {
        if(account == address(0)) {
            revert ZeroAddress();
        }

        if(balances[account] < amount) {
            revert InsufficientFunds();
        }

        balances[account] -= amount;
        totalTokens -= amount;
        emit Transfer(account, address((0)), amount);
    }
}

// contract ERC20SDN is IERC20, Ownable {
//     uint totalTokens;
//     mapping(address => uint) balances;
//     mapping(address => mapping(address => uint)) allowances;

//     error ZeroAddress();
//     error InsufficientFunds();
//     error InsufficientFundsAllowance();

//     /// @dev Initializes the contract with an initial supply of tokens
//     /// @param initialSupply The initial amount of tokens to mint
//     constructor(uint initialSupply) Ownable() {
//         mint(msg.sender, initialSupply);
//     }

//     /// @notice Modifier that checks if the sender has enough tokens
//     modifier enoughTokens(address _from, uint _amount) {
//         require(balanceOf(_from) >= _amount, "Not enough tokens.");
//         _;
//     }

//     /// @notice Returns the name of the token
//     function name() public pure returns (string memory) {
//         return "SdnToken";
//     }

//     /// @notice Returns the symbol of the token
//     function symbol() public pure returns (string memory) {
//         return "SDN";
//     }

//     /// @notice Returns the number of decimals the token uses
//     function decimals() public pure returns (uint8) {
//         return 18;
//     }

//     /// @notice Returns the total token supply
//     function totalSupply() public view returns (uint) {
//         return totalTokens;
//     }

//     /// @notice Returns the account balance of a given account
//     /// @param account The address of the account to query
//     function balanceOf(address account) public view returns (uint) {
//         return balances[account];
//     }

//     /// @notice Transfers tokens to a specified address
//     /// @param to The address to transfer tokens to
//     /// @param amount The amount of tokens to be transferred
//     function transfer(address to, uint amount) external returns (bool) {
//         if (to == address(0)) {
//             revert ZeroAddress();
//         }

//         if (amount > balances[msg.sender]) {
//             revert InsufficientFunds();
//         }

//         balances[msg.sender] -= amount;
//         balances[to] += amount;
//         emit Transfer(msg.sender, to, amount);

//         return true;
//     }

//     /// @notice Returns the remaining number of tokens that spender is allowed to spend
//     /// @param owner The address of the token owner
//     /// @param spender The address of the spender
//     function allowance(address owner, address spender) external view returns (uint) {
//         return allowances[owner][spender];
//     }

//     /// @notice Sets the amount of tokens that a spender is allowed to transfer on behalf of the token owner
//     /// @param spender The address which will spend the funds
//     /// @param amount The amount of tokens to be spent
//     function approve(address spender, uint amount) external returns (bool) {
//         if (spender == address(0)) {
//             revert ZeroAddress();
//         }

//         allowances[msg.sender][spender] = amount;
//         emit Approval(msg.sender, spender, amount);

//         return true;
//     }

//     /// @notice Transfers tokens from one address to another, using the allowance mechanism
//     /// @param owner The address which you want to send tokens from
//     /// @param recipient The address which you want to transfer to
//     /// @param amount The amount of tokens to be transferred
//     function transferFrom(
//         address owner,
//         address recipient,
//         uint amount
//     ) external enoughTokens(owner, amount) returns (bool) {
//         if (recipient == address(0)) {
//             revert ZeroAddress();
//         }

//         if (allowances[owner][msg.sender] < amount) {
//             revert InsufficientFundsAllowance();
//         }

//         allowances[owner][msg.sender] -= amount;
//         balances[owner] -= amount;
//         balances[recipient] += amount;
//         emit Transfer(owner, recipient, amount);

//         return true;
//     }

//     /// @notice Increases the amount of tokens that an owner allowed to a spender
//     /// @param spender The address which will spend the funds
//     /// @param addedValue The additional amount of tokens to be allowed for spending
//     function increaseAllowance(address spender, uint addedValue) public {
//         if (spender == address(0)) {
//             revert ZeroAddress();
//         }

//         allowances[msg.sender][spender] += addedValue;

//         emit Approval(msg.sender, spender, allowances[msg.sender][spender]);
//     }

//     /// @notice Decreases the amount of tokens that an owner allowed to a spender
//     /// @param spender The address which will spend the funds
//     /// @param subtractedValue The reduced amount of tokens to be allowed for spending
//     function decreaseAllowance(address spender, uint subtractedValue) public {
//         if (spender == address(0)) {
//             revert ZeroAddress();
//         }

//         if(allowances[msg.sender][spender] < subtractedValue) {
//             revert InsufficientFundsAllowance();
//         }

//         allowances[msg.sender][spender] -= subtractedValue;
//         emit Approval(msg.sender, spender, allowances[msg.sender][spender]);
//     }

//     /// @notice Mints a specified amount of tokens and assigns them to the sender
//     /// @param amount The amount of tokens to be minted
//     function mint(address account, uint amount) public onlyOwner {
//         if(account == address(0)) {
//             revert ZeroAddress();
//         }

//         balances[account] += amount;
//         totalTokens += amount;
//         emit Transfer(address((0)), account, amount);
//     }

//     /// @notice Burns a specified amount of tokens from the sender
//     /// @param amount The amount of tokens to be burned
//     function burn(address account, uint amount) public onlyOwner {
//         if(account == address(0)) {
//             revert ZeroAddress();
//         }

//         if(balances[account] < amount) {
//             revert InsufficientFunds();
//         }

//         balances[account] -= amount;
//         totalTokens -= amount;
//         emit Transfer(account, address((0)), amount);
//     }
// }
