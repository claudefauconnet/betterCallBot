var bot = (function () {
        var self = {};
        self.elasticUrl = "http://localhost:9200"
        self.index = "totalref_nouns"
        self.neo4jProxyUrl = "http://localhost:3002/neo"
        self.currentConcepts = {}
        self.currentTokens = [];

        self.analyzeQuestion = function (question) {
            $("#neo4jResponseDiv").html("");
            self.currentTokens = [];

            coreNlp.extractTokens(question, function (err, tokens) {
                if (err) {
                    return console.log(err)
                    //  return callback(err);

                }

                var queryTokens = []

                //1) split question into tokens
                tokens = coreNlp.parseCoreNlpJson(tokens);
                var terms = []
                tokens.nouns.forEach(function (noun) {
                    terms.push(noun.lemma);
                    self.currentTokens.push(noun.lemma);
                })
                var payload = {
                    extractConcepts: 1,
                    nouns: JSON.stringify(terms),
                }

                $.ajax({
                    type: "POST",
                    url: "../analyzer",
                    data: payload,
                    dataType: "json",
                    success: function (json) {


                        self.currentQuestionTerms = json;
                        self.showQuestionProposal(json);
                        // self.showQuestionProposalDivs(json);
                    },
                    error: function (err) {
                        console.log(err.responseText)

                    }
                })

            })
        }


        self.searchResponse = function (mean) {

            $("#answersDiv").html("");
            var allResults = [];
            var maxIterations = 20;
            var iteration = 0
            var associations = self.getWordsAssociations();
            var nonConceptwordsStr = "";
            async.eachSeries(associations, function (association, callbackAssociation) {

                if (mean == 'elastic') {
                    self.searchResponseInElastic(association, function (err, result) {
                        if (err) {
                            console.log(err);
                            return callbackAssociation(err);
                        }
                        allResults.push.apply(allResults, result);
                        if (allResults.length < 11)
                            return callbackAssociation();
                        else {

                            return callbackAssociation("end")
                        }

                    })
                }
                else if (mean == 'graph') {
                    self.searchResponseInGraph(association, function (err, result) {
                        if (err) {
                            console.log(err);
                            return callbackAssociation(err);
                        }
                        allResults.push.apply(allResults, result);
                        if (allResults.length < 11)
                            return callbackAssociation();
                        else {

                            return callbackAssociation("end")
                        }
                    })
                }

            }, function (err) {
                self.showSearchResults(allResults);
                //  console.log(JSON.stringify(allResults,null,2));
            })

        }


        self.searchResponseInElastic = function (association, callback) {
            var foundTokens = "";
            var queryString = "";
            var results = [];
            var nonConceptwordsStr = "";
            association.forEach(function (term, indexTerm) {
                foundTokens += term + " ";
                if (indexTerm > 0)
                    queryString += " AND"
                queryString += " ("
                queryString += " " + term;

                var concept = self.currentConcepts[term];
                if (concept) {
                    queryString += " "
                    concept.synonyms.forEach(function (synonym, indexSyn) {
                        if (indexTerm > 0 || indexSyn > 0)
                            queryString += " OR ";
                        queryString += synonym;
                    })
                    queryString += " "
                }
                queryString += " )"

            });
            var nonConceptQuery = [];


            self.currentTokens.forEach(function (token, index) {
                if (foundTokens.indexOf(token) < 0) {
                    nonConceptQuery.push({"match": {"text": token}})
                    foundTokens += token + " ";
                    nonConceptwordsStr += token + " ";

                }
            })
            var _payload = {
                search: 1,
                index: "totalreferentiel5",
                payload: JSON.stringify({
                    "query": {
                        "bool": {
                            "should": nonConceptQuery

                            , "filter":
                                [{
                                    "query_string": {
                                        "query": queryString
                                    }
                                }]
                        }
                    }
                }, null, 2)
            }


            console.log(_payload.payload)
            $.ajax({
                type: "POST",
                url: "../elastic",
                data: _payload,
                dataType: "json",
                success: function (elasticResults) {

                    if (!elasticResults || elasticResults.length == 0)
                        return callback();

                    else
                        elasticResults.forEach(function (elasticResult) {

                            results.push({
                                nonConceptWords: nonConceptwordsStr,
                                association: association,
                                data: elasticResult._source,
                                score: elasticResult._score,
                                queryString: queryString
                            })


                        })

                    return callback(null, results);


                }
                ,
                error: function (err) {
                    console.log(err.responseText)
                    return callback(err);
                }
            })
        }

        self.searchResponseInGraph = function (association, callback) {
            var nonConceptwordsStr = "";

            var match;
            association.forEach(function (concept, index) {
                var type = "concept"

                if (index == 0) {
                    match = " match(n:" + type + ")-[r2]-(p:paragraph) where n.name=\"" + concept + "\" "
                }
                else {
                    match += " WITH p match (p)-[r]-(m:" + type + ") where m.name=\"" + concept + "\""

                }
            })
            match += " with p match (p)-[r]-(c:chapter)-[r2]-(d:document)  return distinct p,c,d"
            console.log(match);
            var payload = {match: match};


            $.ajax({
                type: "POST",
                url: self.neo4jProxyUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    var results = [];
                    data.forEach(function (line) {
                        var chapter = line.c.properties;
                        var document = line.d.properties;
                        var paragraph = line.p.properties;

                        var neoObj = {

                            "fileName": document.name,
                            "docTitle": document.title,
                            "chapter": chapter.name,
                            "parentChapter": parent,
                            "chapterTocNumber": chapter.tocNumber,
                            "text": paragraph.text
                        }

                        results.push({
                            nonConceptWords: "",
                            association: association,
                            data: neoObj,
                            score: 1,
                            queryString: ""
                        })

                    })

                    return callback(null, results);


                }
                , error: function (err) {

                    console.log("done")
                    //    console.log(err.responseText)
                    return callback(err);


                }

            });

        }


        self.elasticQuery = function (index, terms, fields, callback) {

            var payload = {

                index: index,
                queryString: terms,
                fields: JSON.stringify(fields),
                size: 100,

            }


            $.ajax({
                type: "POST",
                url: "../elastic",
                data: payload,
                dataType: "json",
                success: function (json) {
                    return callback(null, json);
                },
                error: function (err) {
                    console.log(err.responseText)
                    return callback(err.responseText);
                }
            })
        }


        self.showQuestionProposal = function (terms) {
            var str = "<table>";
            terms.forEach(function (termObj, index) {

                str += "<tr><td>" + termObj.token + "<td><td>";
                if (termObj.concepts) {
                    str += "<select class='questionItem questionConcept' style='color :green;font-weight: bold'><option>" + "" + "</option><option></option>";
                    var selected = false;

                    termObj.concepts.forEach(function (concept) {
                        if (concept.name.toLowerCase() == termObj.token.toLowerCase())
                            selected = "selected='selected'";
                        var conceptName = "";
                        concept.ancestors.forEach(function (ancestor, index) {
                            conceptName += ancestor;
                            conceptName += "."
                        })
                        conceptName += concept.name
                        str += "<option " + selected + " value='" + concept.name + "'" + concept.name + ">" + conceptName + "</option>"
                    })
                    str += "</select>"
                }
                else {
                    str += "<input class='questionItem questionWord' value='" + termObj.token + "'/>";
                }

                str += "</td>";

                str += "</tr>"

            })
            str += "</table>";


            $("#QuestionConceptsInput").html(str);
        }

        self.showQuestionProposalDivs = function (terms) {

            terms.forEach(function (termObj, index) {


                termObj.concepts.forEach(function (concept) {
                    var divStr = "<div id='" + concept.name + "' class='conceptDiv draghere'>" + concept.name + "</div>";
                    $("#sourceConcepts").append(divStr).promise().done(function () {
                        dnd.makeDraggable()


                    });


                })
            })
        }

        self.showSearchResults = function (results) {

            var str = "";
            if (results.length == 0)
                str = " No results"
            results.forEach(function (result) {
                str += "<div class='answer'>"
                str += "<table>";
                str += "<tr><td>Score</td><td>" + result.score + "</td></tr>"
                str += "<tr><td>Concepts</td><td><b>" + result.association.toString() + "</b></td></tr>"
                str += "<tr><td>Words</td><td><i>" + result.nonConceptWords + "</i></td></tr>"
                str += "<tr><td>FileName</td><td>" + result.data.fileName + "</td></tr>"
                str += "<tr><td>DocTitle</td><td>" + result.data.docTitle + "</td></tr>"
                str += "<tr><td>Chapter</td><td>" + result.data.chapter + "</td></tr>"
                str += "<tr><td>Text</td><td>" + result.data.text + "</td></tr>"
                str += "<tr><td>Tables</td><td>" + result.data.tables + "</td></tr>"

                str += "</table>";
                str += "</div>"

            })


            $("#answersDiv").html(str);

        }

        self.getWordsAssociations = function () {
            var concepts = [];

            $('#QuestionConceptsInput').find(".questionConcept").each(function (select) {
                // var value = $(this).val();
                var value = $(this).find("option:selected").val();
                if (value && value != "") {
                    concepts.push(value);
                }

            })

            $('#QuestionConceptsInput').find(".questionWord").each(function (input) {
                // var value = $(this).val();
                var value = $(this).val();
                if (value && value != "") {
                    concepts.push(value);
                }

            })

            var associations = self.combination(concepts);


            associations.sort(function (a, b) {
                if (a.length > b.length)
                    return -1;
                if (a.length < b.length)
                    return 1;
                return 0;


            })
            return associations;
        }


        self.combination = function (arr) {

            var i, j, temp
            var result = []
            var arrLen = arr.length
            var power = Math.pow
            var combinations = power(2, arrLen)

            // Time & Space Complexity O (n * 2^n)

            for (i = 0; i < combinations; i++) {
                temp = ''

                for (j = 0; j < arrLen; j++) {
                    // & is bitwise AND
                    if ((i & power(2, j))) {
                        temp += arr[j] + ","
                    }
                }
                result.push(temp)
            }
            var result2 = [];

            result.forEach(function (str) {
                var result3 = str.split(",");
                if (result3[result3.length - 1] == "")
                    result3.splice(result3.length - 1, 1);
                result2.push(result3);
            })


            return result2;
        }


        return self;
    }
)
()
