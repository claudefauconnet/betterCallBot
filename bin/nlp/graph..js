var fs = require('fs');
var request = require('request');
var async = require('async');
var elasticQuery = require("./elasticQuery..js");

var graph = {


    createDocs: function (filePath) {
        var str = "" + fs.readFileSync(filePath);
        var json = JSON.parse(str);
        json.forEach(function (doc) {


        })


    },
    createParentConceptsGraph: function (index, subGraph, jsonDocs, callbackGraph) {
        elasticQuery.searchAll("totalref_thesaurus", 10000, function (err, result) {
            var parents = {}
            result.forEach(function (line) {
                var concept = line._source;
                if (concept.ancestors && concept.ancestors.length > 0 && concept.ancestors[0] !== "")
                    parents[concept.name] = concept.ancestors[0]
            })

            var xx = parents;


            graph.executeMatch("match (n:concept) return n.name, id(n) limit 10", function (err, resultNeo) {

                resultNeo.forEach()

                async.eachSeries(resultNeo.data, function (neoConcept, callbackEachNeoConcept) {

                    if (parents[neoConcept.name]) {
                        var path = startId + "/relationships";
                        var payload = {
                            to: "" + endId,
                            data: {},
                            type: relName
                        }
                        request({
                                url: 'http://neo4j:souslesens@127.0.0.1:7474/db/data/node/' + path,
                                json: payload,
                                method: 'POST',
                                headers: {'Content-Type': 'application/json',}
                            },
                            function (err, res) {
                                if (err)
                                    return callbackEachNeoConcept(err);
                                callbackEachNeoConcept();
                            })
                    } else {
                        callbackEachNeoConcept();
                    }


                }, function (err) {
                    if (err)
                        return callbackGraph(err);
                    return callbackGraph("done");

                })

            })


        })
    }
    ,
    createGraph: function (subGraph, jsonDocs, callbackGraph) {
        function cleanForNeo(value) {
            if (isNaN(value)) {
                value = value.replace(/[\n|\r|\t]+/g, " ");
                value = value.replace(/&/g, " and ");
                value = value.replace(/"/g, "'");
                value = value.replace(/,/g, "\\,");
                // value = value.replace(/\//g, "%2F");
                value = value.replace(/\\/g, "")
                //  value = value.replace(/:/g, "")
            }
            return value;
        }


        function createNodes(statements, callback) {

            var ids = {}
            var groups = [];
            var currentGroup = [];
            statements.forEach(function (statement) {
                if (currentGroup.length > 95) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }
                currentGroup.push(statement);
            })
            groups.push(currentGroup);


            async.eachSeries(groups, function (statements, callbackEachSerie) {
                graph.executeStatements(statements, function (err, result) {
                    if (err)
                        return callbackEachSerie(err);


                    result.results.forEach(function (entry) {
                        if (entry.data && entry.data && entry.data.length > 0 && entry.data[0].row) {
                            var obj = {}
                            var name = entry.data[0].row[0];
                            var neoId = entry.data[0].row[1]
                            ids[name] = neoId;
                        }
                    })
                    console.log(statements.length + " /" + result.results.length + "  /" + Object.keys(ids).length)
                    return callbackEachSerie(null);

                })
            }, function (err) {

                return callback(null, ids);
            })
        }

        function createRelations(relations, relName, startLabel, endLabel, ids, callbackRel) {
            async.eachSeries(relations, function (relation, callbackEachRel) {
                var startId = ids[startLabel][relation.start];
                var endId = ids[endLabel][relation.end];
                if (!startId || !endId) {
                    console.log(startId + "  " + endId)
                    return callbackEachRel();
                }
                var path = startId + "/relationships";
                var payload = {
                    to: "" + endId,
                    data: {},
                    type: relName
                }
                request({
                        url: 'http://neo4j:souslesens@127.0.0.1:7474/db/data/node/' + path,
                        json: payload,
                        method: 'POST',
                        headers: {'Content-Type': 'application/json',}
                    },
                    function (err, res) {
                        if (err)
                            return callbackEachRel(err);
                        callbackEachRel();
                    })


            }, function (err) {
                if (err)
                    return callbackRel(err);
                return callbackRel("done");

            })
        }


        /*   var str = "" + fs.readFileSync(fileTokens);
           var jsonTokens = JSON.parse(str);
           var str2 = "" + fs.readFileSync(fileDocs);
           var jsonDocs = JSON.parse(str2);*/
        var ids = {};

        var thesaurusConcepts = {};
        var distinctDocuments = {};
        async.series([
                //load thesaurusConcepts
                function (callbackSeries) {

                    elasticQuery.searchAll("totalref_thesaurus", 10000, function (err, result) {
                        result.forEach(function (line) {
                            var x = result;
                            thesaurusConcepts[line._source.name] = line._source;
                        })

                        callbackSeries();

                    })
                },
                //load documentsPurposeAndscope
                function (callbackSeries) {

                    elasticQuery.searchAll("totalreferentieldocuments5", 10000, function (err, result) {
                        result.forEach(function (line) {
                            var x = result;
                            distinctDocuments[line._source.id] = line._source;
                        })

                        callbackSeries();

                    })
                },


                //create nouns nodes

                //create nouns nodes
                /*  function (callbackSeries) {

                      var statements = [];
                      var distincts = [];
                      statements.push({statement: 'Match (n) where n.subGraph="' + subGraph + '" DETACH DELETE n'})
                      jsonDocs.forEach(function (doc) {
                          doc.nounTokens.forEach(function (noun) {
                              if (distincts.indexOf(noun) < 0) {
                                  distincts.push(noun);
                                  statements.push({statement: "CREATE (n:noun { name: \"" + cleanForNeo(noun) + "\",subGraph:\"" + subGraph + "\"}) RETURN n.name ,id(n) "})
                              }

                          })
                      })
                      statements.push({statement: "match(n:noun) RETURN n.name ,id(n) "});
                      createNodes(statements, function (err, result) {
                          if (err) {
                              return callbackSeries(err);
                          }
                          ids["nouns"] = result
                          return callbackSeries(null, result);
                      })

                  },*/





                // create paragraph nodes
                function (callbackSeries) {
                    var statements = [];
                    jsonDocs.forEach(function (doc) {
                        if (doc.paragraphId) {
                            statements.push({
                                statement: "CREATE (n:paragraph {" +
                                " id: \"" + cleanForNeo(doc.paragraphId) + "\"" +
                                " ,name: \"" + cleanForNeo("P_" + doc.paragraphId) + "\"" +
                                " ,text: \"" + cleanForNeo(doc.text) + "\"" +
                                ",subGraph:\"" + subGraph + "\"}" +
                                ") RETURN n.id ,id(n) "

                            })
                        }


                    })
                    statements.push({statement: "match(n:paragraph) RETURN n.id ,id(n) "});
                    createNodes(statements, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        ids["paragraphs"] = result;
                        return callbackSeries(null, result);
                    })


                },
                // saveIds
                /*    function (callbackSeries) {
                        fs.writeFileSync("D:\\Total\\docs\\nlp\\ids.json", JSON.stringify(ids, null, 2))
                        return callbackSeries(null, "rels");
                    },*/

                // create nouns paragraph relations
                function (callbackSeries) {


                    return callbackSeries(null, []);

                    var relations = []
                    jsonDocs.forEach(function (doc) {
                        doc.nounTokens.forEach(function (token) {
                            relations.push({start: doc.paragraphId, end: token});
                        })
                    })

                    createRelations(relations, "hasToken", "paragraphs", "nouns", ids, function (err, result) {
                        if (err)
                            console.log(err);
                        return callbackSeries(null, result);
                    })


                },
                // create chapter nodes
                function (callbackSeries) {
                    var chapters = []
                    var statements = [];
                    jsonDocs.forEach(function (doc) {
                        if (chapters.indexOf(doc.chapterId) < 0) {
                            chapters.push(doc.chapterId)
                            statements.push({
                                statement: "CREATE (n:chapter {" +
                                " id: \"" + cleanForNeo(doc.chapterId) + "\"" +
                                " ,name: \"" + cleanForNeo(doc.chapterTocNumber + " " + doc.chapter) + "\"" +
                                " ,tocNumber: \"" + cleanForNeo(doc.chapterTocNumber) + "\"" +
                                " ,parent: \"" + cleanForNeo(doc.parentChapter) + "\"" +
                                ",subGraph:\"" + subGraph + "\"}" +
                                ") RETURN n.id ,id(n) "
                            })

                        }
                    })
                    statements.push({statement: "match(n:chapter) RETURN n.id ,id(n) "});
                    createNodes(statements, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        ids["chapters"] = result;
                        return callbackSeries(null, result);
                    })


                },

                // create document nodes
                function (callbackSeries) {
                    var documents=[];
                    var statements = [];
                    jsonDocs.forEach(function (doc) {
                        if (documents.indexOf(doc.docId) < 0) {
                            documents.push(doc.docId)

                            var purposeAndScopeStr = "";
                            var document = distinctDocuments[doc.docId];
                            if (document) {
                                purposeAndScopeStr = document.purposeAndScope;
                                // on ajoute les concepts du document au tableau des tous les paragraphes pour faire simple
                                if (document.concepts)
                                    jsonDocs.push({docId: document.id, concepts: document.concepts})

                            }
                            statements.push({
                                statement: "CREATE (n:document {" +
                                " id: \"" + cleanForNeo(doc.docId) + "\"" +
                                " ,name: \"" + cleanForNeo(doc.fileName) + "\"" +
                                " ,title: \"" + cleanForNeo(doc.docTitle) + "\"" +
                                " ,purposeAndScope: \"" + cleanForNeo(purposeAndScopeStr) + "\"" +
                                ",subGraph:\"" + subGraph + "\"}" +
                                ") RETURN n.id ,id(n) "
                            })

                        }
                    })
                    statements.push({statement: "match(n:document) RETURN n.id ,id(n) "});
                    createNodes(statements, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        ids["documents"] = result;
                        return callbackSeries(null, result);
                    })


                },

                //create concepts (paragraphs and document purpose and scope) nodes
                function (callbackSeries) {
                    var statements = [];
                    var distincts = [];
                    jsonDocs.forEach(function (doc, index) {
                        if (doc.concepts) {
                            if (!doc.concepts.forEach)
                                doc.concepts = [doc.concepts]
                            doc.concepts.forEach(function (concept) {
                                var xx = index;
                                if (distincts.indexOf(concept) < 0) {
                                    distincts.push(concept);
                                    var synonymsStr = "";
                                    var ancestorsStr = "";
                                    var thesaurusConcept = thesaurusConcepts[concept];
                                    if (thesaurusConcept) {
                                        if (thesaurusConcept.synonyms) {
                                            synonymsStr = thesaurusConcept.synonyms.toString().replace("[", "").replace("]", "")
                                        }
                                        if (thesaurusConcept.ancestors) {
                                            ancestorsStr = thesaurusConcept.ancestors.toString().replace("[", "").replace("]", "")
                                        }
                                    }


                                    statements.push({
                                        statement: "CREATE (n:concept { name: \"" + cleanForNeo(concept) + "\"" +
                                        " ,synonyms: \"" + cleanForNeo(synonymsStr) + "\"" +
                                        " ,ancestors: \"" + cleanForNeo(ancestorsStr) + "\"" +
                                        ",subGraph:\"" + subGraph + "\"}) RETURN n.name ,id(n) "
                                    })
                                }
                            })
                        }
                    })


                    statements.push({statement: "match(n:concept) RETURN n.name ,id(n) "});
                    createNodes(statements, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        ids["concepts"] = result;
                        return callbackSeries(null, result);
                    })
                }
                ,



                // create  paragraph concepts relations
                function (callbackSeries) {
                    var relations = []

                    jsonDocs.forEach(function (doc) {
                        if (doc.paragraphId) {
                            if (doc.concepts) {
                                if (!doc.concepts.forEach)
                                    doc.concepts = [doc.concepts]
                                doc.concepts.forEach(function (concept) {
                                    relations.push({start: doc.paragraphId, end: concept});
                                })
                            }
                        }
                    })

                    createRelations(relations, "hasConcept", "paragraphs", "concepts", ids, function (err, result) {
                        if (err)
                            console.log(err);
                        return callbackSeries(null, result);
                    })


                },

                // create  document concepts relations
                function (callbackSeries) {
                    var relations = []
                    var distincts = [];
                    jsonDocs.forEach(function (doc) {
                        if (!doc.paragraphId ) {
                            distincts.push(doc.docId);
                            if (doc.concepts) {
                                if (!doc.concepts.forEach)
                                    doc.concepts = [doc.concepts]
                                doc.concepts.forEach(function (concept) {
                                    relations.push({start: doc.docId, end: concept});
                                })
                            }
                        }
                    })

                    createRelations(relations, "hasConcept", "documents", "concepts", ids, function (err, result) {
                        if (err)
                            console.log(err);
                        return callbackSeries(null, result);
                    })


                },
                // create paragraph chapter relations
                function (callbackSeries) {
                    var relations = []
                    jsonDocs.forEach(function (doc) {
                        relations.push({start: doc.paragraphId, end: doc.chapterId});
                    })

                    createRelations(relations, "inChapter", "paragraphs", "chapters", ids, function (err, result) {
                        if (err)
                            console.log(err);
                        return callbackSeries(null, result);
                    })
                },

                // create chapter doc relations
                function (callbackSeries) {
                    var relations = [];
                    var chapters = [];
                    jsonDocs.forEach(function (doc) {
                        if (chapters.indexOf(doc.chapterId) < 0) {
                            chapters.push(doc.chapterId)
                            relations.push({start: doc.chapterId, end: doc.docId});
                        }
                    })

                    createRelations(relations, "inDocument", "chapters", "documents", ids, function (err, result) {
                        if (err)
                            console.log(err);
                        return callbackSeries(null, result);
                    })


                },


            ],

            //end of functions serie
            function (err, results) {
                if (err) {
                    return console.log("err");
                }


            }
        )

    }

    ,
    executeMatch: function (match, callback) {
        var path = "/db/data/cypher";
        var payload = {query: match}
        request({
                url: 'http://neo4j:souslesens@127.0.0.1:7474' + path,
                json: payload,
                method: 'POST',
                headers: {'Content-Type': 'application/json',}
            },
            function (err, res) {

                if (err)
                    callback(err)
                else if (res.body && res.body.errors && res.body.errors.length > 0) {
                    console.log(JSON.stringify(res.body.errors))
                    callback(res.body.errors)
                }
                else {


                    callback(null, res.body)
                }
            })

    }


    ,
    executeStatements:

        function (statements, callback) {

            //   console.log(statements.length)


            function execute(group) {
                var payload = {
                    "statements": group
                }
                var path = "/db/data/transaction/commit";
                request({
                        url: 'http://neo4j:souslesens@127.0.0.1:7474' + path,
                        json: payload,
                        method: 'POST',
                        headers: {'Content-Type': 'application/json',}
                    },
                    function (err, res) {

                        if (err)
                            callback(err)
                        else if (res.body && res.body.errors && res.body.errors.length > 0) {
                            console.log(JSON.stringify(res.body.errors))
                            callback(res.body.errors)
                        }
                        else {


                            callback(null, res.body)
                        }
                    })


            }

            var groups = [];
            var currentGroup = [];

            statements.forEach(function (statement, index) {

                currentGroup.push(statement)
                if (currentGroup.length > 100 || index >= statements.length - 1) {
                    groups.push(currentGroup);
                    currentGroup = [];
                }

            })

            async.eachSeries(groups, function (group, callback) {

                execute(group, function (err, result) {
                    if (err)
                        return callback(err);
                    return callback();
                })

            }, function (err) {
                if (err) {
                    console.log(err);
                }
            })
        }

    ,


}


if (true) {


    elasticQuery.searchAll("totalreferentiel5", 10000, function (err, result) {

        var docs = [];
        result.forEach(function (line) {
            docs.push(line._source)
        })


        graph.createGraph("totalRef5", docs, function (err, result) {
            var x = err;
        })
    })

}

if (false) {


    graph.createParentConceptsGraph("totalreferentiel5", function (err, result) {
        var x = err;
    })

}


if (false) {
    var str = "aaa"

    var st = {statement: "CREATE (n:noun { name: \"" + str + "\",subGraph:\"" + subGraph + "\"}) RETURN n.name ,id(n)"};

    var statements = [st];
    graph.executeStatements(statements, function (err, result) {
        var ww = err;
    })
}

module.exports = graph