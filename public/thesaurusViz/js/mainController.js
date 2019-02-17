var mainController = (function () {
    var self = {};
    self.currentVisjsDataset = {nodes: [], edges: []};
    self.currentColor;
    self.currentNodeId;
    self.treeLevel = 0;
    self.rootNodeId;


    var vijsDefaults = {
        node: {
            colors: {
                parent: "red",
                child: "green"
            },
            shape: "dot",
            size: 10
        }
    }
    var palette = [
        "#0072d5",
        '#FF7D07',
        "#c00000",
        '#FFD900',
        '#B354B3',
        "#a6f1ff",
        "#007aa4",
        "#584f99",
        "#cd4850",
        "#005d96",
        "#ffc6ff",
        '#007DFF',
        "#ffc36f",
        "#ff6983",
        "#7fef11",
        '#B3B005',
    ]

    var nodeColors = {};


    self.loadThesaurus = function (thesaurusIndex) {

        elastic.currentIndex = thesaurusIndex;
        if (thesaurusIndex == "thesaurus-ingenieur")
            self.rootNodeId = "root";
        else if (thesaurusIndex == "thesaurus-unesco")
            self.rootNodeId = "root";

        self.loadNodes(self.rootNodeId);


    }


    self.loadNodes = function (id, add) {
        var data = []
        async.series([
            //transform skos toJson
            function (callback) {
                elastic.queryIds("parent", id, function (err, result) {
                    if (err)
                        return callback(err);
                    data = result;
                    return callback(null)

                })
            },
            function (callback) {
                // count children
                var index = 0
                async.eachSeries(data, function (line, callbackEach) {
                    elastic.queryIds("parent", line.id, function (err, result2) {
                        data[index++].countChildren = result2.length
                        return callbackEach(null)
                    })
                }, function (err) {
                    callback(null);
                })


            },
            function (callback) {
                self.drawNodes(data, add);
            }
        ])


    }


    self.drawNodes = function (data, add,rootId) {


        var existingNodes = visjsGraph.nodes._data ? Object.keys(visjsGraph.nodes._data) : [];
        var nodes = [];
        var edges = [];


        data.forEach(function (child, index) {
            var parentId = child.ancestors[0];
            if (index == 0 && parentId == self.rootNodeId) {
                self.setNodeColors(data);// prmier niveau donne la couleur des descendants

                var visParent = {
                    label: "thesaurus",
                    hiddenLabel: "thesaurus",
                    color: "grey",
                    id: "root",
                    treeLevel: self.treeLevel,
                    shape: vijsDefaults.node.shape,
                    size: vijsDefaults.node.size //* (parent.children.length == 0 ? 1 : Math.log(parent.children.length))
                }
                nodes.push(visParent);
                self.currentNodeId = "root";
            }
            else {

            }


            if (existingNodes.indexOf("" + child.id) < 0) {
                var childrenIds = [];
                var color = self.currentColor;
                if (parentId == self.rootNodeId)
                    color = nodeColors[child.id];

                var visChild = {
                    label: child.name,
                    hiddenLabel: child.name,
                    color: color,
                    id: child.id,
                    opened: false,
                    parentId: parentId,
                    childrenLoaded: false,
                    treeLevel: self.treeLevel + 1,
                    shape: vijsDefaults.node.shape,
                    size: vijsDefaults.node.size * (child.countChildren == 0 ? 1 : Math.log(child.countChildren))
                }
                if (child.countChildren == 0)
                    visChild.shape = "triangle";

                nodes.push(visChild);
            }
            if (index == 0 && visjsGraph.nodes && visjsGraph.nodes.update)
                visjsGraph.nodes.update({id: parentId, childrenLoaded: true, opened: true})


            var edge = {
                from: self.currentNodeId,
                to: child.id,
                smooth: true,
            }
            edges.push(edge);


        })

        if (nodes.length > 0) {
            if (add) {
                self.treeLevel += 1;
                self.currentVisjsDataset = {
                    nodes: self.currentVisjsDataset.nodes.concat(nodes),
                    edges: self.currentVisjsDataset.edges.concat(edges)
                }
            } else {
                self.treeLevel = 0;
                self.currentVisjsDataset = {nodes: nodes, edges: edges};
            }

            var focusDone = false;
            visjsGraph.draw("graphDiv", self.currentVisjsDataset, {
                smoothRelLine: 1,
                scale: 1,
                onClick: mainController.onClick
            }, function () {
                if (!focusDone && self.currentNodeId) {
                    focusDone = true;
                    visjsGraph.network.focus(self.currentNodeId,
                        {
                            scale: 1.0,
                            animation: {
                                duration: 1000,
                            }
                        });
                }
            })
        }
    }


    self.onClick = function (params) {
        if (params.nodes.length > 0) {
            var id = params.nodes[0];
            self.currentNodeId = id;


            if (nodeColors[id])
                self.currentColor = nodeColors[id];

            visjsGraph.nodes.update({id: id, shadow: true})
            var nodeObj = visjsGraph.nodes._data[id];

            if (!nodeObj.childrenLoaded) {
                self.loadNodes(id, true);
            } else {

                function getAllDecendantsrecurse(id) {
                    for (var key in visjsGraph.nodes._data) {
                        var node = visjsGraph.nodes._data[key];
                        if (node.parentId == id) {
                            descendantIds.push(node.id)
                            getAllDecendantsrecurse(node.id)
                        }
                    }

                }
                var descendantIds = []
                getAllDecendantsrecurse(id);
                var nodes = [];
                var edges=[]
                descendantIds.forEach(function (id) {
                    nodes.push({id: id, hidden: nodeObj.opened});
                    var connectedEdgesIds = visjsGraph.network.getConnectedEdges(id);
                    connectedEdgesIds.forEach(function (idedge) {
                        edges.push({id: idedge, hidden: nodeObj.opened})
                    })
                })
                visjsGraph.nodes.update({id: id, opened:!nodeObj.opened})
                visjsGraph.nodes.update(nodes)
                visjsGraph.edges.update(edges)
             //   visjsGraph.changeLayout($("#layoutSelect").val())
                //visjsGraph.fitToPage();

            }


        }
    }


    self.setLayout = function (layout) {

    }


    self.setNodeColors = function (nodes) {
        nodeColors = {};
        nodes.forEach(function (node, index) {
            nodeColors[node.id] = palette[(index % palette.length)]
        })


    }

    self.search = function (word) {
        var data = [];
        var ids=[];
        async.series([
            //transform skos toJson
            function (callback) {
                elastic.queryMatch("name",word,  function (err, result) {
                    if (err)
                        return callback(err);
                    data = result;
                    return callback(null)

                })
            },
          function (callback) {

              data.forEach(function(line){
                  ids.push(line.id)
              })
              return callback(null)
            },
            function (callback) {

                self.loadNodes(ids);

            }
        ])
    }


    return self;
})()