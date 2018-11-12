var elasticProxy = (function () {
    var self = {};
    self.elasticParams = {
        size: 5000,
        index: "totalreferentiel3",
        queryField: "File",
        elasticUrl: souslesensUrl + "/elastic"
    }

    var allConcepts = []


    self.createCorpusGraph = function () {

        var tokenizedDocs = [];
        var payload = {
            findDocuments: 1,
            options: {
                from: 0,
                size: self.elasticParams.size,
                indexName: self.elasticParams.index,
               // word: "GM_RC_MEC_110_EN_02",
                word: "*",
                booleanSearchMode: "and",
                andWords: [],

            }
        };


        var queryField = self.elasticParams.queryField
        if (queryField != "") {
            payload.options.queryField = queryField;
        }
        $("#dataTable").html("");

//search all rules
        $.ajax({
            type: "POST",
            url: self.elasticParams.elasticUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                var iterations = 0;

                var groups = [];
                var group = [];
                var maxSize = 20
                data.docs.forEach(function (doc) {
                    if (group.length > maxSize) {
                        groups.push(group);
                        group = [];
                    }
                    group.push(doc);


                })
                groups.push(group);

var total=0
               
                async.eachSeries(groups, function (group, callbackEachGroup) {
                    console.log(total+=group.length)

                    async.eachSeries(group, function (doc, callbackEachDoc) {
                            // forEach rules extract nouns


                            var text = doc.text + " " + doc.title;
                            if (doc.table)
                                text += " " + doc.table.replace(/<[^>]*>/, " ")
                            //  var text = doc.Texte;//+ " "+doc.Title;
                            if (false && iterations++ > 5)
                                return callbackEachDoc();


                     
                            coreNlp.analyzeTexts("all", [["", "", text]], "tokens", function (err, analyze) {

                                // forEach word search if exist thesaurus term
                                if (analyze && analyze.length > 0) {
                                    var nouns = analyze[0].tokens.nouns;
                                    var numValues= analyze[0].tokens.numValues;
                                  
                                    doc.nounTokens=analyze[0].tokens.nouns;
                                    doc.numTokens=analyze[0].tokens.numValues;
                                    if(!doc.nounTokens)
                                        doc.nounTokens=[];

                                    if(!doc.numTokens)
                                        doc.numTokens=[];
                                  
                                        tokenizedDocs.push(doc);
                                  /*  else
                                        console.log("no word in thesaurus " + doc.id)*/

                                }

                                return callbackEachDoc();
                            })

                        }, function (err) {

                            neo4jProxy.exportToNeo4j(tokenizedDocs, function (err, result) {
                                if (err)
                                  ;//  console.log(err);
                                console.log("Group DONE")
                                return callbackEachGroup();
                            });


                        }
                    )
                }, function (err) {

                    if (err)
                        console.log(err);
                    console.log("All Groups DONE")
                });


            }
            , error: function (err) {
                console.log(err.responseText)
                return callback(err)


                return (err);
            }

        });
    }
    self.createNeoConcepts = function () {

        var treeData = $("#treeDiv1").jstree()._model.data;

        var keys = Object.keys(treeData);
        async.eachSeries(keys, function (key, callbackKey) {

            var conceptKey = key.substring(8);
            var conceptWord = treeData[key].text;

            if (conceptWord != "Diesel engines")
                ;// return callbackKey();

            if (!conceptWord)
                return callbackKey();
            var synonyms = treeData[key].data.synonyms;
            var payload = {
                findDocuments: 1,
                options: {
                    from: 0,
                    size: self.elasticParams.size,
                    indexName: self.elasticParams.index,
                    word: conceptWord,
                    booleanSearchMode: "or",
                    andWords: synonyms,
                    slop: 2,
                    queryField: "Texte"

                }
            };

            synonyms.push(conceptWord);
            $.ajax({
                type: "POST",
                url: self.elasticParams.elasticUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {

                    allConcepts.push({conceptKey: conceptKey, conceptWord: conceptWord, docs: data.docs})


                    return callbackKey();
                }, error: function (err) {
                    console.log(err);
                    return callbackKey();
                }
            })


        }, function (err) {
            var statements = [];

//console.log(JSON.stringify(allConcepts,null,2))
            allConcepts.forEach(function (concept) {
                statements.push({statement: "MERGE  (n:concept { name: \"" + concept.conceptKey + "\",word:\"" + concept.conceptWord.replace(/"/g, "") + "\",subGraph:\"totalRef\"})"});
                concept.docs.forEach(function (doc) {
                    statements.push({statement: "match (n:fragment { name: \"" + doc.id + "\"}),  (m:concept { name: \"" + concept.conceptKey + "\"}) create (n)-[:hasConcept]->(m)"});

                })


            })
            //   console.log(JSON.stringify(statements))
            neo4jProxy.executeStatements(statements, function (err, result) {
                if (err)
                    return console.log(err);
                return console.log("DONE");
            })


        })


    }


    return self;
})()