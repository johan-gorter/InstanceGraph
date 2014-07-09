/// <reference path="~/lib/d3.js" />

/*globals $, d3 */
/*jslint browser: true, vars: true, indent: 2 */


(function () {

  // definitions
  var html = $.element.html;
  var svg = $.element.svg;
  var createFragmentType = window.fragment.createFragmentType;

  // Using zepto, borrowing from d3 when needed.
  var initZoom = function (handleZoom, visualization, onRescale) {

    var rescale = function () {
      var trans = window.d3.event.translate;
      var scale = window.d3.event.scale;
      visualization
        .attr("transform",
          "translate(" + trans + ")"
          + " scale(" + scale + ")");
      onRescale(scale, trans);
    };

    window.d3.select(handleZoom[0])
      .call(window.d3.behavior.zoom().on("zoom", rescale))
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



  var createInstance = function (appendTo, id, graph, dataSource, pos) {
    var focussed = false;
    var getReverseRelations;
    var getRelations;
    var getAttributes ;
    var afterLoad = {};
    var x = pos ? pos[0] : 0;
    var y = pos ? pos[1] : 0;
    var data = null;
    var bindings = [];
    var bindingFactory = window.fragment.createBindingFactory(bindings);
    var layoutData = {
      width: 160,
      visibleReverseRelationsCount: 0,
      visibleRelationsCount: 0,
      visibleAttributesCount: 0,
      totalHeight: 45
    };
    var layoutBindings = [];
    var layoutBindingFactory = window.fragment.createBindingFactory(layoutBindings);

    var api = {
      id: id,
      getPosition: function () {
        return [x, y];
      },
      getRelations: function () {
        return getRelations(); // temporary for testing
      }, 
      render: function () {
        updateLayoutData();
        layoutEverything();
      },
      getId: function () {
        return id;
      },
      getGraph: function () {
        return graph;
      },
      setFocus: function (focus) {
        focussed = focus;
        if (focus) {
          rootGroup.addClass("focus");
          expandCollapsePath.attr("transform", "rotate(180 10 4)");
          updateLayoutData();
          layoutEverything();
        } else {
          rootGroup.removeClass("focus");
          expandCollapsePath.attr("transform", "");
          updateLayoutData();
          layoutEverything();
        }
      },
      showReverseOf: function (relation, relationIsReverse) {
        if (data) {
          showReverseOf(relation, relationIsReverse);
        } else {
          afterLoad.showReverseOf = relation;
          afterLoad.showReverseOfIsReverse = relationIsReverse;
        }
      },
      getRelationPosition: function (relation, relationIsReverse, anchor) {
        if (!data) {
          return [x, y];
        }
        var offset = relationIsReverse ? 31 : 33;
        if (!relationIsReverse) {
          getReverseRelations().forEach(function (reverseRelation) {
            if (focussed || reverseRelation.isSelected()) {
              offset += 20;
            }
          });
        }
        offset = offset + relation.getIndex() * 20;
        return [x + (anchor === "right" ? layoutData.width/2 : -layoutData.width/2), y + offset + 10];
      },
      dispose: function () {
        getRelations().forEach(function (relation) {
          relation.setSelected(false);
        });
        getReverseRelations().forEach(function (relation) {
          relation.setSelected(false);
        });
        rootGroup.remove();
        subscription.dispose();
      }
    };

    var createAttributeFactory = function (attributeType) {
      return {
        createFragment: function (dummyType, append, id, instance) {
          return createAttribute(append, id, attributeType, instance);
        }
      };
    };

    // the bindings and markup
    var separator2Y = layoutBindingFactory.attribute(function (d) { return (d.visibleReverseRelationsCount * 20 + 32); });
    var relationsGroupTransform = layoutBindingFactory.attribute(function (d) { return "translate(0, " + (d.visibleReverseRelationsCount * 20 + 33) + ")"; });
    var separator3Y = layoutBindingFactory.attribute(function (d) { return ((d.visibleReverseRelationsCount + d.visibleRelationsCount) * 20 + 34); });
    var attributesGroupTransform = layoutBindingFactory.attribute(function (d) { return "translate(0, " + ((d.visibleReverseRelationsCount + d.visibleRelationsCount)*20 + 35) + ")"; });
    var expandCollapseTransform = layoutBindingFactory.attribute(function (d) { return "translate(-10, " + (d.totalHeight - 9) + ")"; });
    var backgroundX = layoutBindingFactory.attribute(function (d) { return -d.width/2; });
    var textStartX = layoutBindingFactory.attribute(function (d) { return 10 - d.width / 2;});
    var textColumnWidth = layoutBindingFactory.attribute(function (d) { return d.width / 2 - 15; });
    var textWidth = layoutBindingFactory.attribute(function (d) { return d.width - 20; });
    var width = layoutBindingFactory.attribute("width");
    var totalHeight = layoutBindingFactory.attribute("totalHeight");
    var lineStartX = layoutBindingFactory.attribute(function (d) { return -d.width/2; });
    var lineEndX = layoutBindingFactory.attribute(function (d) { return d.width / 2; });

    var expandCollapsePath, expandCollapseGroup, resizeRect;
    var rootGroup = svg.g({ "class": "instance" },
      svg.rect({
        "class": "background", x: backgroundX, y: "0",
        width: width, height: layoutBindingFactory.attribute("totalHeight"), rx: "10", ry: "10"
      }),
      svg.clipPath({ id: "clip-" + id }, svg.rect({ x: textStartX, y: "0", width: textWidth, height: totalHeight })),
      svg.clipPath({ id: "clip-key-" + id }, svg.rect({ x: textStartX, y: "0", width: textColumnWidth, height: totalHeight })),
      svg.clipPath({ id: "clip-value-" + id }, svg.rect({ x: "5", y: "0", width: textColumnWidth, height: totalHeight })),
      svg.text({ "class": "title", "clip-path": "url(#clip-" + id + ")", "text-anchor": "left", x: textStartX, y: "4", dy: "15", "pointer-events": "none" },
        bindingFactory.text("title")
      ),
      svg.line({ x1: lineStartX, y1: "30", "x2": lineEndX, y2: "30", "class": "separator" }),
      svg.g({ "transform": "translate(0,31)" },
        bindingFactory.fragmentPerItem("reverseRelations", api, createAttributeFactory("reverseRelation"), function (getChildFragments) { getReverseRelations = getChildFragments; })
      ),
      svg.line({ x1: lineStartX, y1: separator2Y, "x2": lineEndX, y2: separator2Y, "class": "separator" }),
      svg.g({ "transform": relationsGroupTransform },
        bindingFactory.fragmentPerItem("relations", api, createAttributeFactory("relation"), function (getChildFragments) { getRelations = getChildFragments; })
      ),
      svg.line({ x1: lineStartX, y1: separator3Y, "x2": lineEndX, y2: separator3Y, "class": "separator" }),
      svg.g({ "transform": attributesGroupTransform },
        bindingFactory.fragmentPerItem("attributes", api, createAttributeFactory("attribute"), function (getChildFragments) { getAttributes = getChildFragments; })
      ),
      resizeRect = svg.rect({x: lineEndX, y: 0, width: 5, height: totalHeight, fill: "transparent", cursor: "ew-resize"}),
      expandCollapseGroup = svg.g({ transform: expandCollapseTransform },
        expandCollapsePath = svg.path({ "class": "expand-collapse", d: "M5,3 l 5,3 l 5,-3" }),
        svg.rect({ "class": "button", x: "0", y: "0", width: "20", height: "8" })
      )
    );

    var updateLayoutData = function () {
      if(!getReverseRelations) return;
      layoutData.visibleReverseRelationsCount = 0;
      getReverseRelations().forEach(function (item) {
        if (focussed || item.isSelected()) {
          item.setIndex(layoutData.visibleReverseRelationsCount++);
        } else {
          item.setIndex(-1);
        }
      });
      layoutData.visibleRelationsCount = 0;
      getRelations().forEach(function (item) {
        if (focussed || item.isSelected()) {
          item.setIndex(layoutData.visibleRelationsCount++);
        } else {
          item.setIndex(-1);
        }
      });
      layoutData.visibleAttributesCount = 0;
      getAttributes().forEach(function (item) {
        if (focussed || item.isSelected()) {
          item.setIndex(layoutData.visibleAttributesCount++);
        } else {
          item.setIndex(-1);
        }
      });
      layoutData.totalHeight =
        (layoutData.visibleReverseRelationsCount + layoutData.visibleRelationsCount + layoutData.visibleAttributesCount) * 20 + 45;
    };

    function renderPosition() {
      // moves the group into x,y
      rootGroup.attr("transform", "translate(" + x + "," + y + ")");
      graph.renderRelations();
    }

    function layoutEverything() {
      // positions everything inside the group
      layoutBindings.forEach(function (binding) {
        binding.update(layoutData, window.fragment.immediateDiff);
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

    function updateWidth(item) {
      item.setWidth(layoutData.width);
    }

    function setWidth(newWidth) {
      layoutData.width = newWidth;
      if(getReverseRelations) {
        getReverseRelations().forEach(updateWidth);
        getRelations().forEach(updateWidth);
        getAttributes().forEach(updateWidth);
      }
    };

    function beginResize(fromX, fromY) {
      var oldWidth = layoutData.width;
      var oldX = x;
      var scale = graph.getScale();
      var from = toSVGCoordinates(rootGroup[0], fromX, fromY);
      var svg = $(rootGroup[0].ownerSVGElement);
      function moveTo(toX, toY) {
        var to = toSVGCoordinates(rootGroup[0], toX, toY);
        var newWidth = oldWidth + (to[0] - from[0]) / scale;
        if(newWidth < 80) {
          newWidth = 80;
        }
        setWidth(newWidth);
        x = oldX + (newWidth - oldWidth) / 2;
        renderPosition();
        layoutEverything();
      };
      function mouseMoved(evt) {
        moveTo(evt.clientX, evt.clientY);
      };
      svg.on("mousemove", mouseMoved);
      svg.one("mouseup", function (evt) {
        svg.off("mousemove", mouseMoved);
      });
    };

    resizeRect.on("mousedown", function (evt) {
      beginResize(evt.clientX, evt.clientY, null);
      evt.stopPropagation();
    });

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

    var showReverseOf = function (otherRelation, otherRelationIsReverse) {
      if(otherRelationIsReverse) {
        var reverseId = otherRelation.getReverseOf();
        getRelations().forEach(function (relation) {
          if(relation.id === reverseId) {
            relation.setSelected(true);
            graph.addVisibleRelation(relation, otherRelation);
          }
        });
      } else {
        getReverseRelations().forEach(function (relation) {
          if (relation.getReverseOf() === otherRelation.id) {
            relation.setSelected(true);
            graph.addVisibleRelation(otherRelation, relation);
          }
        });
      }
    };

    // Initialization

    renderPosition();
    layoutEverything();

    // listen to the dataSource
    var subscription = dataSource.subscribe(id, function (newData) {
      data = newData;
      if(!newData) {
        graph.hideInstance(id); // calls our dispose()
      } else {
        bindings.forEach(function (binding) {
          binding.update(newData, window.fragment.immediateDiff);
        });
        if(afterLoad.showReverseOf) {
          showReverseOf(afterLoad.showReverseOf, afterLoad.showReverseOfIsReverse);
          afterLoad = {};
        }
        updateLayoutData();
        layoutEverything();
        graph.renderRelations();
      }
    });


    return api;
  };



  // ATTRIBUTE



  var createAttribute = function (append, id, type, instance) {
    var data = null;
    var bindings = [];
    var bindingFactory = window.fragment.createBindingFactory(bindings);
    var layoutData = {
      width: 160
    };
    var layoutBindings = [];
    var layoutBindingFactory = window.fragment.createBindingFactory(layoutBindings);

    var index = -1;
    var backgroundRect;
    var selected = false;

    var nameText = bindingFactory.text(function (d) {
      return (data.name || data.id);
    });
    var valueText = bindingFactory.text(function (d) {
      return ((typeof data.stored === "string") ? data.stored : "");
    });

    var width = layoutBindingFactory.attribute("width");
    var textStartX = layoutBindingFactory.attribute(function (d) { return 10-d.width / 2; });
    var backgroundStartX = layoutBindingFactory.attribute(function (d) { return -d.width / 2; });

    var rootGroup = svg.g({ "class": "attribute", "display": "none" },
      backgroundRect = svg.rect({ "class": "background", x: backgroundStartX, y: "0", width: width, height: "20" }),
      svg.text({
        "class": "name", "text-anchor": "left", "clip-path": "url(#clip-key-" + instance.getId() + ")",
        x: textStartX, y: "0", dy: "15", "pointer-events": "none"
      }, nameText),
      svg.text({
        "class": "value", "text-anchor": "left", "clip-path": "url(#clip-value-" + instance.getId() + ")",
        x: "10", y: "0", dy: "15", "pointer-events": "none"
      }, valueText)
    );

    backgroundRect.on("mousedown", function (evt) {
      evt.stopPropagation();
    });
    backgroundRect.on("mouseup", function (evt) {
      evt.stopPropagation();
    });

    var appendRelationLine = function (appendTo, id, index) {
      html.label({ "class": "line" },
        html.input({ type: "checkbox" })
          .prop("checked", instance.getGraph().isInstanceVisible(id))
          .on("click", function (evt) {
            if($(this).prop("checked")) {
              instance.getGraph().showInstance(id, instance, api, index, type==="reverseRelation");
            } else {
              instance.getGraph().hideInstance(id);
            }
          }
        ),
        html.span(id)
      ).appendTo(appendTo);
    };

    var createDialog = function (appendTo) {
      html.h1(data.name || data.id).appendTo(appendTo);
      html.button("Hide")
        .on("click", function (evt) {
          evt.preventDefault();
          api.setSelected(false);
          instance.render();
          instance.getGraph().removeDialog();
        })
        .appendTo(appendTo);
      if(type === "attribute") {
        html.textarea().val(data.stored).prop('readonly', true).appendTo(appendTo);
      } else {
        // todo: header
        if(data.stored instanceof Array) {
          for(var i = 0; i < data.stored.length; i++) {
            appendRelationLine(appendTo, data.stored[i], i);
          }
        } else {
          appendRelationLine(appendTo, data.stored, 0);
        }
      }
      return {
      };
    };

    backgroundRect.on("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!selected) {
        api.setSelected(true);
      } else {
        instance.getGraph().showDialog(createDialog);
      }
    });

    append(rootGroup);

    var render = function () {
      bindings.forEach(function (binding) {
        binding.update(data, window.fragment.immediateDiff);
      });
    };
    var renderLayout = function () {
      layoutBindings.forEach(function (binding) {
        binding.update(layoutData, window.fragment.immediateDiff);
      });
    };

    var api = {
      id: id,
      isReverseRelation: function () {
        return !!data.reverse;
      },
      getReverseOf: function () {
        return data.reverse;
      },
      init: function (initData) {
        data = initData;
        render();
      },
      update: function (newData) {
        data = newData;
        render();
      },
      destroy: function () {
      },
      getIndex: function () {
        return index;
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
      setSelected: function (newSelected) {
        if(selected !== newSelected) {
          selected = newSelected;
          rootGroup.toggleClass("selected", newSelected);
          instance.render();
          if (selected) {
            instance.getGraph().showRelations(api);
          } else {
            instance.getGraph().hideRelations(api);
          }
        }
      },
      isSelected: function () {
        return selected;
      },
      getValue: function () {
        return data.stored;
      },
      forEachValue:function (callback) {
        if(data.stored) {
          if(data.stored instanceof Array) {
            data.stored.forEach(callback);
          } else {
            callback(data.stored, 0);
          }
        }
      },
      getInstance: function () {
        return instance;
      },
      setWidth:function (newWidth) {
        layoutData.width = newWidth;
        renderLayout();
      }
    };

    renderLayout();
    return api;
  };


  // RELATION (edge)


  var createRelation = function (appendTo, relation, reverseRelation) {
    var path = svg.path({ "class": "relation", d: "" });
    path.appendTo(appendTo);
    return {
      isConnectedTo: function (aRelation) {
        return aRelation === relation || aRelation === reverseRelation;
      },
      render: function () {
        var from = relation.getInstance().getRelationPosition(relation, false, "right");
        var to = reverseRelation.getInstance().getRelationPosition(reverseRelation, true, "left");
        path[0].setAttribute("d", "M"+from+" L"+to);
      },
      dispose: function () {
        path.remove();
      }
    };
  };



  // INSTANCE GRAPH



  window.createInstanceGraph = function (appendTo, id, dataSource /*{subscribe(id, function)}*/, startInstanceId) {

    // state
    var instances = [];
    var relations = [];
    var scale = 1;
    var onRescale = function (newScale) {
      scale = newScale;
    };

    // Initialization
    var handleZoom, backgroundElement, visualization, instancesGroup, relationsGroup;
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
      },
      removeDialog: function () {
        chartSvg.find(".overlay").remove();
      },
      isInstanceVisible: function (id) {
        for(var i = 0; i < instances.length; i++) {
          if(instances[i].id === id) {
            return true;
          }
        }
        return false;
      },
      showInstance: function (instanceId, fromInstance, relation, itemNr, relationIsReverse) {
        var x = 0;
        var y = 0;
        if(fromInstance && relation) {
          var pos = fromInstance.getPosition();
          x = pos[0] + (300 * (relationIsReverse ? -1 : 1));
          y = pos[1] + relation.getIndex() * 20 + itemNr * 40;
        }
        var instance = createInstance(instancesGroup, instanceId, parentApi, dataSource, [x, y]);
        instances.push(instance);
        instance.showReverseOf(relation, relationIsReverse);
      },
      hideInstance: function (instanceId) {
        for(var i = 0; i < instances.length; i++) {
          var instance = instances[i];
          if(instance.id === instanceId) {
            instance.dispose();
            instances.splice(i, 1);
            return;
          }
        }
        throw new Error("instance not found: " + instanceId);
      },
      hideRelations: function (relation) {
        for(var i = 0; i < relations.length;) {
          if (relations[i].isConnectedTo(relation)) {
            relations[i].dispose();
            relations.splice(i, 1);
          } else {
            i++;
          }
        }
      },
      showRelations: function (relation) {
        relation.forEachValue(function (value) {
          instances.forEach(function (instance) {
            if(instance.id === value) {
              instance.showReverseOf(relation, relation.isReverseRelation());
            }
          });
        });
      },
      addVisibleRelation: function (relation, reverseRelation) {
        relations.push(createRelation(relationsGroup, relation, reverseRelation));
        parentApi.renderRelations();
      },
      renderRelations: function () {
        relations.forEach(function (relation) {
          relation.render();
        });
      }
    };
    parentApi.showInstance(startInstanceId, null, null);
    return {
      test: function () {
        setTimeout(function () {
          parentApi.requestFocus(instances[0]);
          instances[0].getRelations().forEach(function (relation, index) {
            relation.setSelected(true);
            var value = relation.getValue();
            if (value instanceof Array) {
              value.forEach(function (instanceId) {
                parentApi.showInstance(instanceId, instances[0], relation, index, false);
              });
            } else {
              parentApi.showInstance(value, instances[0], relation, index, false);
            }
          });
        }, 50);
      }
    };
  };

}());