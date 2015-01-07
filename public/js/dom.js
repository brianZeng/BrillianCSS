/**
 * Created by 柏然 on 2014/10/21.
 */
(function(ext){
  var sections={},XHR=ext.XHR;
  function sendXHR(address){
    var xhr=new XHR(address,'get',XHR.createOptions('document','text/html'));
    xhr.send();
    return xhr;
  }
  function invoke(func,arguments,thisObj){
    if(typeof  func=="function")
      func.apply(thisObj,Array.isArray(arguments)?arguments:[arguments]);
    return false;
  }
  function loadingSection(sctName,onsuccess,onfail,onfinal){
    var section=sections[sctName];
    if(section instanceof Element)
     return invoke(onsuccess,section);
    else if(section instanceof Error)
     return invoke(onfail,section);
    else if(section==undefined){
      section=sections[sctName]=sendXHR('feature/'+sctName);
      section.on('fail',function(e){this.emit('error',sections[sctName]=new Error(e));})
        .on('success',function(xhr){
          var doc=xhr.responseXML;
          if(doc) this.emit('data',(sections[sctName]=doc.querySelector('section')));
          else this.emit('error',new Error(xhr));
        })
        .on('data',onsuccess).on('error',onfail).on('done',onfinal);
    }
    else if(section instanceof XHR)
      section.on('data',onsuccess).on('error',onfail).on('done',onfinal);
    return section;
  }
  ext.loadingSection=loadingSection;
})(window.ext);
(function(){
  var $=function(s){return document.querySelector(s);},$$=function(s){return Array.prototype.slice.apply(document.querySelectorAll(s))};
  var editor=CodeMirror.fromTextArea(document.querySelector('#parseSource'),{
    mode:'text/x-scss',
    lineNumbers:true,
    lineWrapping:true,
    value:document.querySelector('#parseSource').value
  }),
    player=CodeMirror.fromTextArea(document.querySelector('#parseResult'),{
    mode:'text/css',
    lineNumbers:true,
    lineWrapping:true,
    disableInput:true,
    value:document.querySelector('#parseResult').value
  });
  var parse=$('#parseBtn').onclick=function(e,input){
    try{
      var r=ChangeSS(input||editor.getValue());
      onSheet(r,player);
    }
    catch (e){
      console.log(e.message, e.stack||e);
      debugger;
    }
  };
  var SECTIONSelector='#featureSection';

  function onSheet(src,editor){
     editor.setValue($('#bssStyle').innerHTML=src);
  }
  parse(null,$('#bssStyle').innerHTML);
  function onclickSectionArrow(e){
    window.ext.loadingSection(e.target.getAttribute('data-section'),function(section){
      $(SECTIONSelector).innerHTML=section.innerHTML;
    })
  }
  $$('.items> div> p').forEach(function(ele,i){
    ele.addEventListener('click',onclickSectionArrow,false);
    if(i==0) onclickSectionArrow({target:ele});
  });

})();

