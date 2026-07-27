export function createHistory(limit=250){
  const undoStack=[];const redoStack=[];
  return{
    execute(command){command.do();undoStack.push(command);if(undoStack.length>limit)undoStack.shift();redoStack.length=0;},
    undo(){const command=undoStack.pop();if(!command)return false;command.undo();redoStack.push(command);return true;},
    redo(){const command=redoStack.pop();if(!command)return false;command.do();undoStack.push(command);return true;},
    clear(){undoStack.length=0;redoStack.length=0;},
    canUndo:()=>undoStack.length>0,
    canRedo:()=>redoStack.length>0
  };
}

export function snapshotCommand(store,before,after,label="Edit"){
  return{label,do:()=>store.replace(after),undo:()=>store.replace(before)};
}
