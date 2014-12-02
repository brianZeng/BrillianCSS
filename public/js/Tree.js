/**
 * Created by 柏然 on 2014/11/4.
 */
function Tree(root){
  if(!(this instanceof Tree))return new Tree(root);
  this.root=root;
}
function TreeNode(data,left,right){
  if(!(this instanceof TreeNode))return new TreeNode(data,left,right);
  this.data=data;
  this.setBoth(left,right);
}
Tree.prototype={
  set root(data){
    this._root=TreeNode.prototype.setNode.apply({},['left',data])||null;
  },
  get root(){return this._root;}
};
TreeNode.prototype={
  setBoth:function(left,right){
    this.setNode('left',left);
    this.setNode('right',right);
    return this;
  },
  setNode:function(side,dataOrNode){
    if(dataOrNode==undefined) dataOrNode=null;
    side=side=='right'? 'right':'left';
    if(dataOrNode!==null && !(dataOrNode instanceof TreeNode))
      dataOrNode=new TreeNode(dataOrNode);
    return this[side]=dataOrNode;
  },
  preVisit:function(array){
    var child;
    array=array||[];
    array.push(this.data);
    if(child=this.left) child.preVisit(array);
    if(child=this.right)child.preVisit(array);
    return array;
  },
  inVisit:function(array){
    var child;
    array=array||[];
    if(child=this.left) child.inVisit(array);
    array.push(this.data);
    if(child=this.right)child.inVisit(array);
    return array;
  },
  postVisit:function(array){
    var child;
    array=array||[];
    if(child=this.left) child.postVisit(array);
    if(child=this.right)child.postVisit(array);
    array.push(this.data);
    return array;
  },
  getNextChild:function(child){
    if(child===this)return 0;
    if(child===this.left)return this.right;
    return child===this.right? 0:this.left;
  }
};
TreeNode.postVisit=function(node,array){
  var stack=[],childNode=0;
  array=array||[];
  do{
    if(childNode=node.getNextChild(childNode)){
      stack.push(node);
      node=childNode;
      childNode=0;
    }
    else{
      array.push(node.data);
      node=stack[stack.length-1].getNextChild(node);
      if(!node)childNode=node=stack.pop();
    }
  }while(stack.length&&node);
  if(node)array.push(node.data);
  return array;
};
(function(){
   var tree=new Tree('a'),root=tree.root;
   root.setBoth('b','e');
   root.right.setBoth('f','k');
   root.left.setNode('left','c').setBoth('g','h');
   root.left.setNode('right','d').setBoth('l');
  //console.log(TreeNode.postVisit(new TreeNode('up').setBoth('down')));
   console.log(TreeNode.postVisit(root));

})();
