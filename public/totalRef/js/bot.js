var bot = (function () {
        var self = {};
        self.elasticUrl = "http://localhost:9200"
        self.index = "totalref_nouns"
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
                        self.showQuestionProposalDivs(json);
                    },
                    error: function (err) {
                        console.log(err.responseText)

                    }
                })

            })
        }


        self.searchResponseInElastic = function () {

            $("#answersDiv").html("");
            var allResults = [];
            var maxIterations = 20;
            var iteration = 0
            var associations = self.getWordsAssociations();

            async.eachSeries(associations, function (association, callbackAssociation) {
                var foundTokens = "";
                var queryString = ""
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

                self.currentTokens.forEach(function (token) {
                    if (foundTokens.indexOf(token) < 0) {
                        nonConceptQuery.push({"match": {"text": token}})
                        foundTokens+=token+ " ";
                    }
                })
                var _payload = {
                    search: 1,
                    index: "totalreferentiel5",
                    payload:JSON.stringify( {
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
                    },null,2)
                }


                console.log(_payload.payload)
                $.ajax({
                    type: "POST",
                    url: "../elastic",
                    data: _payload,
                    dataType: "json",
                    success: function (elasticResults) {

                        if (!elasticResults || elasticResults.length == 0)
                            return callbackAssociation();

                        else
                            elasticResults.forEach(function (elasticResult) {

                                allResults.push({
                                    association: association,
                                    data: elasticResult._source,
                                    score: elasticResult._score,
                                    queryString: queryString
                                })


                            })
                        if (allResults.length < 11)
                            return callbackAssociation();
                        else
                            return callbackAssociation("end");


                    }
                    ,
                    error: function (err) {
                        console.log(err.responseText)
                        return callbackAssociation(err);
                    }
                })


            }, function (err) {
                self.showSearchResults(allResults);
                //  console.log(JSON.stringify(allResults,null,2));
            })

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

        self.showQuestionProposalDivs= function (terms) {

            terms.forEach(function (termObj, index) {


                termObj.concepts.forEach(function (concept) {
                    var divStr = "<div id='" + concept.name + "' class='conceptDiv'>" + concept.name + "</div>";
                    $("#sourceConcepts").append(divStr).promise().done(function () {
                        $(".conceptDiv").draggable({helper: "clone", opacity: 0.5, cursor: "crosshair", scope: "drop"});

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
                str += "<tr><td>words</td><td>" + result.association.toString() + "</td></tr>"
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
