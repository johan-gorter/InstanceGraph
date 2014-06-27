(function () {
  window.d3 = window.d3;
  var app = angular.module('instanceGraphApp', []);


  //temp static data
  var staticData = [
  {
    id: "project1",
    entity: "Project",
    title: "Pet store",
    reverseRelations: [],
    relations: [
      { id: "users", owns: true, stored: ["user1"] },
      { id: "issues", owns: true, stored: ["issue1"] }
    ],
    attributes: [
      { id: "name", stored: "Pet store" }
    ]
  },
  {
    id: "issue1",
    entity: "Issue",
    title: "1: Become the next big thing",
    reverseRelations: [
      { id: "project", reverse: "issues", owner: true, stored: "project1" }
    ],
    relations: [
      { id: "assignee", stored: "user1" }
    ],
    attributes: [
      { id: "headline", stored: "Become the next big thing" },
      { id: "issueNumber", stored: 1 }
    ]
  },
  {
    id: "user1",
    entity: "User",
    title: "Alice",
    reverseRelations: [
      { id: "project", reverse: "users", owner: true, stored: "project1" },
      { id: "assignedIssues", reverse: "assignee", name: "assigned issues", stored: ["issue1"] }
    ],
    relations: [
    ],
    attributes: [
      { id: "name", stored: "Alice" }
    ]
  }
  ];

  var dataSource = {
    subscribe: function (instanceId, dataCallback) {
      setTimeout(function () {
        for (var i = 0; i < staticData.length; i++) {
          if (staticData[i].id === instanceId) {
            dataCallback(staticData[i]);
            return;
          }
        }
        dataCallback(null);
      }, 300);
      return {
        dispose: function () { }
      };
    }
  };
  //

  app.directive('handleZoom', function () {
    return {
      restrict:"A",
      link: function (scope, element, attrs) {
        scope.scale = 1;
        scope.followMouseDrag = function (evt, onMove, onEnd) {
          var clientStart = toSVGCoordinates(evt.clientX, evt.clientY);
          function mouseMoved(moveEvt) {
            var xy = toSVGCoordinates(moveEvt.clientX, moveEvt.clientY);
            onMove(xy[0] - clientStart[0], xy[1] - clientStart[1]);
          };
          element.on("mousemove", mouseMoved);
          element.one("mouseup", function (upEvt) {
            element.off("mousemove", mouseMoved);
            onEnd();
          });

        };
        scope.followTouchDrag = function (touch, onMove) {
          // TODO
        };

        function toSVGCoordinates(clientX, clientY) {
          var svgElement = element[0].ownerSVGElement;
          var point = svgElement.createSVGPoint();
          point.x = clientX, point.y = clientY;
          point = point.matrixTransform(svgElement.getScreenCTM().inverse());
          return [point.x, point.y];
        }

        // Let D3 do the scaling and padding for us
        var visualization = angular.element(element[0].querySelector(".visualization")); //.find(".visualization");

        var rescale = function () {
          var trans = d3.event.translate;
          var scale = d3.event.scale;
          visualization
            .attr("transform",
              "translate(" + trans + ")"
              + " scale(" + scale + ")");
          scope.scale = scale;
        };

        d3.select(element[0])
          .call(d3.behavior.zoom().on("zoom", rescale))
          .on("dblclick.zoom", null);

        element.on('$destroy', function () {
          // should do: zoom off
        });
      }
    };
  });


  app.controller('sceneCtrl', function ($scope) {
    $scope.instances = [
      {
        id: "project1",
        x: 0,
        y: 0
      }
    ];
  });

  app.controller('instanceCtrl', function ($scope) {

    var currentDrag = null; // {startX, startY}

    $scope.load = function (initData) {
      $scope.id = initData.id;
      $scope.x = initData.x;
      $scope.y = initData.y;
      $scope.height = 45;
      $scope.selectedAttributes = {};
      $scope.instanceData = {}; // loads async
      dataSource.subscribe($scope.id, function (data) {
        $scope.$apply(function (scope) {
          scope.instanceData = data;
          scope.height = 45 + (data.reverseRelations.length + data.relations.length + data.attributes.length) * 20;
          scope.relationsStartY = 32 + (data.reverseRelations.length) * 20;
          scope.attributesStartY = 34 + (data.reverseRelations.length + data.relations.length) * 20;
        });
      });
    };

    $scope.beginDrag = function (evt) {
      if(currentDrag == null) {
        currentDrag = { startX: $scope.x, startY: $scope.y };
        $scope.followMouseDrag(evt, function (dx, dy) {
          $scope.$apply(function (scope) {
            scope.x = currentDrag.startX + dx / $scope.scale;
            scope.y = currentDrag.startY + dy / $scope.scale;
          });
        }, function () {
          currentDrag = null;
        });
      }
      evt.stopPropagation();
    };

    $scope.beginTouchDrag = function (evt) {
      //TODO
      evt.stopPropagation();
    };
  });

  app.directive('instanceAttribute', function () {
    return {
      restrict: 'A',
      controller: function ($scope) {
        var id = $scope.attribute.id;
        var isSelected = function () {
          return !!$scope.selectedAttributes[id];
        }; 
        return {
          isSelected: isSelected,
          click: function (evt) {
            evt.preventDefault();
            if(isSelected()) {
              delete $scope.selectedAttributes[id];
            } else {
              $scope.selectedAttributes[id] = true;
            }
          },
          valueText: function () {
            var value = $scope.attribute.stored;
            if(typeof value === "string") {
              return value;
            }
            return "";
          }
        };
      },
      controllerAs: 'attributeCtrl',
      templateUrl: 'partials/attribute.html'
    };
  });

}());

