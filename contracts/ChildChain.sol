pragma solidity ^0.4.10;
import "./ERC20.sol";
import "./SafeMath.sol";

// Based on Alex Miller's design, with minor revisions to appease the compiler, and incorporate Christian Lundkvist's
// input about hash collisions.

contract ChildChain is ERC20 {
    using SafeMath for uint;
    /*
     * Events
     */

    event CreateBlock(
        uint blockNum,
        address newOwner,
        uint256 amount,
        bytes32 inputId
    );    
    
    /*
     * Storage
     */
    struct UTXO {
       address owner;
       uint value;
       bytes32 id;
       bool iSpended;
    }
    
    struct Block {
       uint blockNum;
       bytes root;
       bytes32 utxoId;
       uint utxoValue;
       address newOwner;
       uint amount;
       bytes sigs;
    }
    

    mapping (uint256 => Block) public chain;
    uint public constant CHILD_BLOCK_INTERVAL = 1000;
    address public operator;
    uint public currentChildBlock;
    mapping (bytes32 => UTXO) public utxos;
    
    /*
     * Modifiers
     */    
    modifier onlyOperator() {
        require(msg.sender == operator, "Sender must be operator.");
        _;
    }
    
    /*
     * Constructor
     */

    constructor() public {
        operator = msg.sender;
        currentChildBlock = CHILD_BLOCK_INTERVAL;
        utxos[keccak256(abi.encodePacked(operator))] = UTXO(operator, 0, keccak256(abi.encodePacked(operator)), false);
    }
    
    function getJt(uint _amont) public view returns (uint) {
        return _amont.mul(2);
    }
    
    function getEth(uint _amont) public view returns (uint) {
        return _amont.div(2);
    }
    /**
     * @dev deposit ETH to ChildChain.
     * @param _owner The owner of ETH.
     * @param _amount The number of ETH.
     * @param _root root of the block.
     * @param _blockNum of the block.
     */
    function depositChildChain(address _owner, uint _amount, bytes _root, uint _blockNum) public onlyOperator {
      
        Block memory block = Block ({
            blockNum : _blockNum,
            root : _root,
            utxoId : keccak256(abi.encodePacked(operator)),
            utxoValue : 0,
            newOwner : operator,
            amount : _amount,
            sigs : ""
        });
        
        chain[_blockNum] = block;
        utxos[keccak256(abi.encodePacked(operator))].value += _amount;
        if (_owner != address(0)) {
          transfer(_owner, getJt(_amount));
        }
    }
    
    function createChildBlock(uint _amount) public {
        require(msg.sender != address(0));
        transfer(operator, _amount);

        uint ethAmount = getEth(_amount);
        require(ethAmount <= utxos[keccak256(abi.encodePacked(operator))].value);
        uint blockNum = currentChildBlock;
        currentChildBlock += CHILD_BLOCK_INTERVAL;
        address newowner = msg.sender;
        bytes32 inputId =  keccak256(abi.encodePacked(operator));
        
        bytes32 utxoId = keccak256(abi.encodePacked(blockNum, ethAmount, newowner));
        utxos[keccak256(abi.encodePacked(operator))].value -= ethAmount;
        utxos[utxoId] = UTXO(msg.sender, ethAmount, utxoId, false);
       emit CreateBlock(blockNum, newowner, ethAmount, inputId); 
    }
    
    function addBlock(bytes _txsig, uint _blockNum, address _newowner, uint _amount, bytes _root) public onlyOperator {
      
        Block memory block = Block ({
            blockNum : _blockNum,
            root : _root,
            utxoId : keccak256(abi.encodePacked(operator)),
            utxoValue : _amount,
            newOwner : _newowner,
            amount : _amount,
            sigs : _txsig
        });
        
        chain[_blockNum] = block;
        bytes32 utxoId = keccak256(abi.encodePacked(_blockNum, _amount, _newowner));
        utxos[utxoId].iSpended = true;
    }
    
}