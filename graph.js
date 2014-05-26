/// <reference path="lib/d3.js" />

/*globals $, d3 */
/*jslint browser: true, vars: true, indent: 2 */

(function () {

  // definitions
  var html = $.element.html;
  var svg = $.element.svg;

  // Using jQuery, wrapping d3 functionality when needed.
  var initZoom = function (handleZoom, visualization) {

    var rescale = function () {
      var trans = d3.event.translate;
      var scale = d3.event.scale;
      visualization
        .attr("transform",
          "translate(" + trans + ")"
          + " scale(" + scale + ")");
    };

    d3.select(handleZoom[0])
      .call(d3.behavior.zoom().on("zoom", rescale))
      .on("dblclick.zoom", null);
  };


  // INSTANCE

  var createInstance = function (appendTo) {
    var model = null;

    var backgroundRect, titleText, reverseRelationsGroup, relationsGroup, attributesGroup;
    var rootGroup = svg.g({"class": "instance selected"},
      backgroundRect = svg.rect({ "class": "background", x: "-80", y: "0", width: "160", height: "40", rx: "10", ry: "10" }),
      titleText = svg.text({ "class": "title", "text-anchor": "middle", y: "4", dy: "15" }, ""),
      svg.line({x1:"-80", y1: "30", "x2": "80", y2: "30", "class": "separator" }),
      reverseRelationsGroup = svg.g(),
      relationsGroup = svg.g(),
      attributesGroup = svg.g()
    );

    appendTo.append(rootGroup);

    return {
      init: function (data) {
        model = data;
        titleText.text(data.title);
      },
      update: function (newData) {
        
      }
    };
  };

  // INSTANCE GRAPH

  window.createInstanceGraph = function (appendTo) {

    "use strict";
  
    // state
    var model = null;


    // Utility functions

    // Initialization
    var handleZoom, backgroundElement, visualization, instancesGroup, relationsGroup;
    var instances = [];
    var defs = html.div({ "class": "svg-defs"},
        svg.svg(
          svg.defs(
            svg.linearGradient({ id: "instance-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
              svg.stop({offset: "0%", "class": "instance-gradient-from"}),
              svg.stop({offset: "100%", "class": "instance-gradient-to"})
            ),
            svg.linearGradient({ id: "selected-instance-gradient", x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
              svg.stop({ offset: "0%", "class": "selected-instance-gradient-from" }),
              svg.stop({ offset: "100%", "class": "selected-instance-gradient-to" })
            )
          )
        )
      );
    var chartSvg = html.div({ "class": "chart" },
      svg.svg({preserveAspectRatio: "xMidYMid slice", viewBox: "-600 -600 1200 1200", "pointer-events": "all" },
        handleZoom = svg.g({ "class": "handle-zoom"},
          backgroundElement = svg.rect({"class": "background", x: "-600", y: "-600", width: "1200", height: "1200", fill: "transparent"}),
          visualization = svg.g({"class": "visualization"},
            relationsGroup = svg.g(),
            instancesGroup = svg.g()
          )
        )
      ));
    appendTo.append(defs);
    appendTo.append(chartSvg);

    initZoom(handleZoom, visualization);

    // API

    return {
      init: function (data) {
        model = data;
        for(var i = 0; i < model.instances.length; i++) {
          var instanceData = model.instances[i];
          var instance = createInstance(instancesGroup);
          instance.init(instanceData);
          instances.push(instance);
        }
      },
    
      update: function(newData) {
      }
    };
  };

}());