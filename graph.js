/// <reference path="~/lib/d3.js" />

/*globals $, d3 */
/*jslint browser: true, vars: true, indent: 2 */


(function () {

  // definitions
  var html = $.element.html;
  var svg = $.element.svg;

  // Using jQuery, wrapping d3 functionality when needed.
  var initZoom = function (handleZoom, visualization, onRescale) {

    var rescale = function () {
      var trans = d3.event.translate;
      var scale = d3.event.scale;
      visualization
        .attr("transform",
          "translate(" + trans + ")"
          + " scale(" + scale + ")");
      onRescale(scale, trans);
    };

    d3.select(handleZoom[0])
      .call(d3.behavior.zoom().on("zoom", rescale))
      .on("dblclick.zoom", null);
  };

  function toSVGCoordinates(element, clientX, clientY) {
    var svgElement = element.ownerSVGElement;
    var point = svgElement.createSVGPoint();
    point.x = clientX, point.y = clientY;
    point = point.matrixTransform(svgElement.getScreenCTM().inverse());
    return [point.x, point.y];
  }

  // INSTANCE

  var createInstance = function (appendTo, id, graph) {
    var model = null;
    var focussed = false;
    var reverseRelations = [];
    var relations = [];
    var attributes = [];
    var x = 0;
    var y = 0;
    var backgroundRect, titleText, reverseRelationsGroup, relationsGroup, attributesGroup, separator2, separator3, clipPath, keyClipPath, valueClipPath, expandCollapsePath, expandCollapseGroup;
    var rootGroup = svg.g({"class": "instance"},
      backgroundRect = svg.rect({ "class": "background", x: "-80", y: "0", width: "160", height: "40", rx: "10", ry: "10" }),
      expandCollapseGroup = svg.g({transform: "translate(60, 5)"},
        expandCollapsePath = svg.path({"class":"expand-collapse", d: "M5,8 l 5,3 l 5,-3"}),
        svg.rect({ "class": "button", x: "0", y: "0", width: "18", height: "20" })
      ),
      svg.clipPath({ id: "clip-" + id }, clipPath = svg.rect({ x: "-70", y: "0", width: "130", height: "40" })),
      svg.clipPath({ id: "clip-key-" + id }, keyClipPath = svg.rect({ x: "-70", y: "0", width: "65", height: "40" })),
      svg.clipPath({ id: "clip-value-" + id }, valueClipPath = svg.rect({ x: "5", y: "0", width: "65", height: "40" })),
      titleText = svg.text({ "class": "title", "clip-path": "url(#clip-" + id + ")", "text-anchor": "left", x: "-70", y: "4", dy: "15", "pointer-events": "none" }, ""),
      svg.line({x1:"-80", y1: "30", "x2": "80", y2: "30", "class": "separator" }),
      reverseRelationsGroup = svg.g({"transform": "translate(0,30)"}),
      separator2 = svg.line({ x1: "-80", y1: "32", "x2": "80", y2: "32", "class": "separator" }),
      relationsGroup = svg.g({ "transform": "translate(0,30)" }),
      separator3 = svg.line({ x1: "-80", y1: "34", "x2": "80", y2: "34", "class": "separator" }),
      attributesGroup = svg.g({ "transform": "translate(0,30)" })
    );

    function renderPosition() {
      rootGroup.attr("transform", "translate(" + x + "," + y + ")");
    }

    function initAttributes(group, items, datas) {
      datas.forEach(function (data) {
        var attribute = createAttribute(group, data.id, parentApi);
        items.push(attribute);
        attribute.init(data);
      });
    };

    function click(evt) {
      graph.requestFocus(api);
    };

    function beginDrag(fromX, fromY, touchIdentifier) {
      var oldX = x;
      var oldY = y;
      var moved = false;
      var scale = graph.getScale();
      var from = toSVGCoordinates(rootGroup[0], fromX, fromY);
      var svg = $(rootGroup[0].ownerSVGElement);
      function moveTo(toX, toY) {
        var to = toSVGCoordinates(rootGroup[0], toX, toY);
        x = oldX + (to[0] - from[0]) / scale;
        y = oldY + (to[1] - from[1]) / scale;
        renderPosition();
      };
      function mouseMoved(evt) {
        moved = true;
        moveTo(evt.clientX, evt.clientY);
      };
      function dragEnd(evt) {
        if(!moved) {
          click(evt);
        }
      }
      if(touchIdentifier) {
        svg.on("touchmove", function (evt) {
          for(var i = 0; i < evt.changedTouches.length; i++) {
            var touch = evt.changedTouches[i];
            if(touch.identifier === touchIdentifier) {
              moveTo(touch.clientX, touch.clientY);
            }
          }
        });
        //TODO: touchend
      } else {
        svg.on("mousemove", mouseMoved);
        svg.one("mouseup", function (evt) {
          svg.off("mousemove", mouseMoved);
          dragEnd(evt);
        });
      }
    };

    rootGroup.on("mousedown", function (evt) {
      beginDrag(evt.clientX, evt.clientY, null);
      evt.stopPropagation();
    });

    rootGroup.on("touchstart", function (evt) {
      beginDrag(evt.clientX, evt.clientY, evt.targetTouches[0].identifier);
      evt.stopPropagation();
    });

    expandCollapseGroup.on("mousedown mouseup touchstart", function (evt) {
      evt.stopPropagation();
    });
    expandCollapseGroup.on("click", function (evt) {
      click(evt);
    });

    appendTo.append(rootGroup);

    function positionAttributes(group, items, offset, indexOffset) {
      group.attr("transform", "translate(0, " + (offset + indexOffset * 20) + ")");
      var index = 0;
      items.forEach(function (item) {
        if (focussed || item.isSelected()) {
          item.setIndex(index++);
        } else {
          item.setIndex(-1);
        }
      });
      return indexOffset+index;
    }

    var positionEverything = function () {
      var indexOffset = 0;
      indexOffset = positionAttributes(reverseRelationsGroup, reverseRelations, 31, indexOffset);
      separator2.attr("y1", indexOffset * 20 + 32).attr("y2", indexOffset * 20 + 32);
      indexOffset = positionAttributes(relationsGroup, relations, 33, indexOffset);
      separator3.attr("y1", indexOffset * 20 + 34).attr("y2", indexOffset * 20 + 34);
      indexOffset = positionAttributes(attributesGroup, attributes, 35, indexOffset);
      backgroundRect.attr("height", indexOffset * 20 + 45);
      clipPath.attr("height", indexOffset * 20 + 45);
      keyClipPath.attr("height", indexOffset * 20 + 45);
      valueClipPath.attr("height", indexOffset * 20 + 45);
    };

    var parentApi = {
      getId: function () {
        return id;
      },
      getGraph: function () {
        return graph;
      }
    };
    var api = {
      init: function (data) {
        model = data;
        titleText.text(data.title);
        initAttributes(reverseRelationsGroup, reverseRelations, data.reverseRelations);
        initAttributes(relationsGroup, relations, data.relations);
        initAttributes(attributesGroup, attributes, data.attributes);
        positionEverything();
      },
      update: function (newData) {
        
      },
      getGraph: function () {
        return graph;
      },
      setFocus: function (focus) {
        focussed = focus;
        if(focus) {
          rootGroup.addClass("focus");
          expandCollapsePath.attr("transform", "rotate(180 10 9)");
          positionEverything();
        } else {
          rootGroup.removeClass("focus");
          expandCollapsePath.attr("transform", "");
          positionEverything();
        }
      }
    };
    return api;
  };

  // ATTRIBUTE

  var createAttribute = function (appendTo, id, instance) {
    var model = null;
    var index = -1;
    var backgroundRect, nameText, valueText;
    var selected = false;
    var rootGroup = svg.g({ "class": "attribute", "display": "none" },
      backgroundRect = svg.rect({ "class": "background", x: "-80", y: "0", width: "160", height: "20" }),
      nameText = svg.text({
        "class": "name", "text-anchor": "left", "clip-path": "url(#clip-key-" + instance.getId() + ")",
        x: "-70", y: "0", dy: "15", "pointer-events": "none"
      }, ""),
      valueText = svg.text({
        "class": "value", "text-anchor": "left", "clip-path": "url(#clip-value-" + instance.getId() + ")",
        x: "10", y: "0", dy: "15", "pointer-events": "none"
      }, "")
    );

    backgroundRect.on("mousedown", function (evt) {
      evt.stopPropagation();
    });
    backgroundRect.on("mouseup", function (evt) {
      evt.stopPropagation();
    });

    var createDialog = function (appendTo) {
      var dialog = html.div(
        html.h1(model.name || model.id),
        html.button("Hide")
      );
      appendTo.append(dialog);
      return {
      };
    };

    backgroundRect.on("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if(!selected) {
        selected = true;
        rootGroup.addClass("selected");
      } else {
        instance.getGraph().showDialog(createDialog);
      }
    });

    appendTo.append(rootGroup);

    return {
      init: function (data) {
        model = data;
        nameText.text(data.name || data.id);
        valueText.text((typeof data.stored === "string") ? data.stored : "");
      },
      update: function (data) {

      },
      setIndex: function (newIndex) {
        index = newIndex;
        if(newIndex === -1) {
          rootGroup.attr("display", "none");
        } else {
          rootGroup.attr("display", "");
          rootGroup.attr("transform", "translate(0, " + (20 * index) + ")");
        }
      },
      isSelected: function () {
        return selected;
      }
    };
  };

  // INSTANCE GRAPH

  window.createInstanceGraph = function (appendTo, id) {

    "use strict";
  
    // state
    var model = null;
    var scale = 1;
    var onRescale = function (newScale) {
      scale = newScale;
    };

    // Utility functions

    // Initialization
    var handleZoom, backgroundElement, visualization, instancesGroup, relationsGroup;
    var instances = [];
    var focussedInstance = null;
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

    initZoom(handleZoom, visualization, onRescale);

    // API
    var parentApi = {
      getScale: function () {
        return scale;
      },
      requestFocus: function (instance) {
        if(focussedInstance) {
          focussedInstance.setFocus(false);
        }
        if(instance === focussedInstance) {
          focussedInstance = null;
          instance.setFocus(false);
        } else {
          focussedInstance = instance;
          focussedInstance.setFocus(true);
        }
      },
      showDialog: function (callback) {
        var dialog = $("<div class='overlay'><div class='dialog'><div class='close'>&times;</div></div></div>")
          .on("click", function (evt) {
            var target = $(evt.target); 
            if(target.closest(".close").length === 1 || target.closest(".dialog").length === 0) {
              evt.preventDefault();
              dialog.remove();
            }
          })
          .appendTo(chartSvg);
        callback(chartSvg.find(".dialog"));
      }
    };
    return {
      init: function (data) {
        model = data;
        for(var i = 0; i < model.instances.length; i++) {
          var instanceData = model.instances[i];
          var instance = createInstance(instancesGroup, instanceData.id, parentApi);
          instance.init(instanceData);
          instances.push(instance);
        }
      },
    
      update: function(newData) {
      }
    };
  };

}());