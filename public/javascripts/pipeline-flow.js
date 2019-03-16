var selectedItem;
var pressedKey = undefined;
var fixedNodes = ['Input','Output'];
var points = [];
var prefixColors = [
  {bg:'#5899DA',fg:'#fff'},
  {bg:'#E8743B', fg:'#fff'},
  {bg:'#19A979',fg:'#fff'},
  {bg:'#ED4A7B', fg:'#fff'},
  {bg:'#945ECF', fg:'#fff'},
  {bg:'#13A4B4', fg:'#fff'},
  {bg:'#525DF4', fg:'#fff'},
  {bg:'#BF399E', fg:'#fff'},
  {bg:'#6C8893', fg:'#fff'},
  {bg:'#EE6868', fg:'#fff'},
  {bg:'#2F6497', fg:'#fff'}
];
var prefixColorMap = {};
var prefixColorIndx = 0;

var defaultElements = {
  nodes: [
    { data: { id: fixedNodes[0], type:'source', label:`${fixedNodes[0]}`}, classes:'fixed-node'  },
    { data: { id: fixedNodes[1], type:'sink', label:`${fixedNodes[1]}`}, classes:'fixed-node' }
  ],
  edges: [
  ]
};

var cy;
var css = cytoscape.stylesheet()
  .selector('node')
    .css({
      'content': 'data(label)',
      'text-opacity': 1.0,
      'text-valign': 'center',
      'text-halign': 'center',
      'background-color': '#eee',
      'color':'#666',
      'height': '30',
      'border-width':'1',
      'border-color':'#fff',
      'shape':'roundrectangle',
      'font-size': '14px'
    })
  .selector('edge')
    .css({
      'curve-style': 'bezier',
      'width': 1,
      'arrow-scale':'1',
      'target-arrow-shape': 'triangle',
      'line-color': '#666',
      'target-arrow-color': '#666'
    })
  .selector('.fixed-node')
    .css({
      'content': 'data(label)',
      'color':'#666',
      'width': '60',
      'shape': 'tag',
      'border-color':'#888',
      'padding':'0px'
    })
  .selector('.selected')
    .css({
      'border-color':'#f00',
      'line-color': '#f00',
      'target-arrow-color': '#f00',
      'border-width': '2px'
    });

function buildGraph(el){
  cy = window.cy = cytoscape({
    container: document.getElementById('workspace'),

    boxSelectionEnabled: true,
    autounselectify: false,
    zoom: 10,
    pan: { x: 0, y: 0 },
    minZoom: 0.6345643593969714,
    maxZoom: 10,
    zoomingEnabled: true,
    userZoomingEnabled: true,
    elements: el,
    layout: {
      name: 'dagre'
    },
    style: css
  });

  cy.on('select', 'node', function(evt){
    var element = evt.target;
  
    if(selectedItem != undefined && selectedItem !== element){
      connectElements(selectedItem, element);
    }else{
      element.addClass('selected');
      selectedItem = evt.target;
    }
  });
  
  cy.on('unselect', 'node', function(evt){
    var element = evt.target;
    element.removeClass('selected');
    if(pressedKey != 17){
      selectedItem = undefined;
    }
  });
  
  cy.on('select', 'edge', function(evt){
    var element = evt.target;
    element.addClass('selected');
    selectedItem = element;
  });
  
  cy.on('unselect', 'edge', function(evt){
    var element = evt.target;
    element.removeClass('selected');
    if(pressedKey != 17){
      selectedItem = undefined;
    }
  });
}


function hasConnectionBetween(sourceElement, targetElement){
  var sourceId = sourceElement.json().data.id;
  var targetId = targetElement.json().data.id;
  var has = false;

  if(cy.json().elements.edges == undefined) return false;

  cy.json().elements.edges.map( e => {
    if( (e.data.source == sourceId && e.data.target == targetId) || 
      (e.data.source == targetId && e.data.target == sourceId))has = true;
  });

  return has;
}

function connectElements(sourceElement, targetElement){
  if(sourceElement === targetElement)return;

  // var sourceType = sourceElement.json().data.type;
  // var targetType = targetElement.json().data.type;

  generateComponent();

  if(hasConnectionBetween(sourceElement, targetElement)){
    return;
  }

  cy.add({ group: "edges", data: { source: sourceElement.data().id, target: targetElement.data().id } });
  sourceElement.removeClass('selected');
  targetElement.addClass('selected');
  sourceElement.deselect();
  selectedItem = targetElement;
}

window.addEventListener("keydown", function(e,obj){
  
  if( (e.keyCode == 127 || e.keyCode == 8) && selectedItem != undefined && isDeleteable(selectedItem)){
    cy.remove(selectedItem);
    selectedItem = undefined;
  }

  if(e.keyCode == 27 && selectedItem != undefined){
    selectedItem.toggleClass('selected');
    selectedItem = undefined;
  }

  if(e.keyCode == 83 && pressedKey == 17){
    savePipeline();
    e.preventDefault();
  }

  pressedKey = e.keyCode;
});

window.addEventListener("keyup", function(e){
  if(e.keyCode == pressedKey)pressedKey = undefined;
});


$(document).ready(function(){

  var forms = document.getElementsByClassName('needs-validation');
  Array.prototype.filter.call(forms, function(form) {
    form.addEventListener('submit', function(event) {
      if (form.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });

  $('#pipeline-save-form').submit(validatePipelineForm);

  var packageList = [];
  $('h5.stage-prefix').each( (a,b) => packageList.push(hash(b.innerText)));
  for(var i=0; i<packageList.length; i++){
    var p = packageList[i];
    var colors = getPrefixColor(p);
    css.selector(`.${p}`).css({
      'background-color':colors.bg, 
      'color':colors.fg
    });
  }

  var elements = $('#edit-component').val();
  if(elements){
    elements = JSON.parse(elements);

    elements.nodes.forEach(e => {
      if(!fixedNodes.includes(e.data.id)){
        e.classes = hash(e.data.type);
      }else{
        e.classes='fixed-node';
      }
    });
    buildGraph(elements);
  }else{
    buildGraph(defaultElements);
  }

  render();

  $('.stages').click(function(){
    var type = $(this).attr('data-type');
    var rootId = $(this).attr('data-name');
    var configName = `${type}.${rootId}`;
    rootId = rootId.substring(0,1).toUpperCase()+rootId.substring(1);
    var width = (rootId.length*9)+4;
    
    cy.add({
      group: "nodes",
      data: { type:type, configName:configName, label:rootId},
      style:{width: width},
      classes: hash(type),
      position: { x: 100, y: 30 }
    });
  });

  $('#menu-pipeline-save').click(savePipeline);
});

function savePipeline(){
  generateComponent();
  var pipeline = extractSerialPipeline(points[fixedNodes[0]]);
  $('#pipeline-save-form input[name=stages]').val(JSON.stringify(pipeline));
  $('#pipeline-save-form input[name=elements]').val(JSON.stringify(cy.json().elements));
  $('#pipeline-save-modal').modal({});

  return false;
}

function render(){

  if(cy.json().elements.nodes){
    cy.json().elements.nodes.forEach(element => {
      if(fixedNodes.includes(element.data.id))return;
    
      var width = element.data.label.length*8;
      var e = cy.getElementById(element.data.id);
      e.style({width:width});
      
    });
  }
}

function isDeleteable(element){
  if(element != undefined && !fixedNodes.includes(element.id())){
    return true;
  }else{
    return false;
  }
}

function generateComponent(){
  //var nodes = cy.json().elements.nodes == undefined?[]:cy.json().elements.nodes;
  var edges = cy.json().elements.edges == undefined?[]:cy.json().elements.edges;
  points = [];

  for(var i=0; i< edges.length; i++){
    var edge = edges[i];
    var n = cy.getElementById(edge.data.source).json();

    if(Object.keys(points).includes(n.data.id)){
      n = points[n.data.id];
    }else{
      points[n.data.id] = n;
    }

    var c = cy.getElementById(edge.data.target).json();
    if(Object.keys(points).includes(c.data.id)){
      c = points[c.data.id];
    }else{
      points[c.data.id] = c;
    }

    if(n.children == undefined){
      n.children = [];
    }

    if(c.parents == undefined){
      c.parents = [];
    }

    n.children[c.data.id] = c;
    c.parents[n.data.id] = n;
  }
}

function extractSerialPipeline(node, pipeline){
  if(node == undefined)return;
  if(pipeline == undefined) pipeline = new Array();

  if(node.data != undefined && node.data.configName != undefined){
      pipeline.push(node.data.configName);  
  }

  if(node.children != undefined){
    var child;
    if(Object.keys(node.children).length > 1){
      child = extractParallelPipeline(node.children, pipeline);
      return extractSerialPipeline(child, pipeline);
    }else{
      var key = Object.keys(node.children)[0];
      child = node.children[key];

      if( Object.keys(child.parents).length == 1){
        extractSerialPipeline(child, pipeline);  
      }else{
        return child;
      }
    }
  }

  return pipeline;
}

function extractParallelPipeline(children, pipeline){
  if(pipeline == undefined) pipeline = new Array();

  var lastChild;
  var parallelPipeline = new Array();

  for(var i=0; i< Object.keys(children).length; i++){
    var key = Object.keys(children)[i];
    var child = children[key];
    var localParallelPipeline = new Array();
    lastChild = extractSerialPipeline(child, localParallelPipeline);
    parallelPipeline.push(localParallelPipeline);
  }

  pipeline.push(parallelPipeline);
  return lastChild;
}

function getPrefixColor(type){
  if(prefixColorMap[type] == undefined){
      prefixColorMap[type] = prefixColorIndx;
      prefixColorIndx++;
      if(prefixColorIndx > prefixColors.length-1)prefixColorIndx = 0;

      return prefixColors[prefixColorMap[type]];
  }else{
    return prefixColors[prefixColorMap[type]];
  }
}

function validatePipelineForm(){
  var name = document.forms["newPipelineForm"]["name"].value;
  if(name == undefined || name.trim() == ""){
    $(document.forms["newPipelineForm"]["name"]).addClass('invalid');
    return false; 
  }

  var path = document.forms["newPipelineForm"]["path"].value;
  if(path == undefined || path.trim() == ""){
    return false;
  }

  var stages = document.forms["newPipelineForm"]["stages"].value;
  if(stages == undefined || stages.trim() == ""){
    $(document.forms["newPipelineForm"]["stages"]).siblings('.invalid-feedback').show();
    return false;
  }

  var elements = document.forms["newPipelineForm"]["elements"].value;
  if(elements == undefined || elements.trim() == ""){
    $(document.forms["newPipelineForm"]["stages"]).siblings('.invalid-feedback').show();
    return false;
  }

  return true;
}

function hash(str){
  if(str != undefined){
    str = str.trim().toLowerCase();
    return Array.from(str).map( c => c.charCodeAt(0).toString(16) ).join("").toUpperCase();
  }

  throw new Error("Invalid string");
}