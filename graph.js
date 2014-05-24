/// <reference path="lib/d3.js" />

/*globals $ */
/*jslint browser: true, vars: true, indent: 2 */

window.createInstanceGraph = function (appendTo) {

  "use strict";
  
  // variables
  var html = $.element.html;
  var svg = $.element.svg;


  // Utility functions

  // Initialization
  var handleZoom, backgroundElement, visualization;
  var chartSvg = 
    svg.svg({preserveAspectRatio: "xMidYMid slice", viewBox: "-600 -600 1200 1200", "pointer-events": "all" },
      handleZoom = svg.g({ "class": "handle-zoom"},
        backgroundElement = svg.rect({"class": "background", x: "-600", y: "-600", width: "1200", height: "1200", fill: "transparent"}),
        visualization = svg.g({"class": "visualization"})
      )
    );
  appendTo.append(chartSvg);
  // API

  return {
    init: function (data) {
    },
    
    update: function(newData) {
    }
  };
};