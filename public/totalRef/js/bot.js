var bot = (function () {
        var self = {};
        self.elasticUrl = "http://localhost:9200"
        self.index = "totalref_nouns"
        self.currentConcepts = {}


        self.analyzeQuestion = function (question) {
            $("#neo4jResponseDiv").html("");

            coreNlp.extractTokens(question, function (err, tokens) {
                if (err) {
                    return console.log(err)
                    //  return callback(err);

                }

                var queryTokens = []

                //1) split question into tokens
                tokens = coreNlp.parseCoreNlpJson(tokens);
                var terms = []
                async.eachSeries(tokens.nouns, function (noun, callback) {

                        //2) search tokens in thesaurus
                        var obj = {term: noun.lemma, parents: []}
                        self.elasticQuery("totalref_thesaurus", noun.lemma, ["text", "data.synonyms"], function (err, results) {
                            if (err)
                                console.log(err)

                            results.forEach(function (result) {
                                var concept = result._source;
                                if (!obj.concepts)
                                    obj.concepts = [];
                                obj.concepts.push(concept.text);
                                var ancestors = (concept.parent.substring(concept.parent.indexOf('#') + 1)).replace(/\-/g, "/");
                                self.currentConcepts[concept.text] = {
                                    name: concept.text,
                                    ancestors: ancestors,
                                    synonyms: concept.data.synonyms
                                }

                                if (obj.parents.indexOf(concept.parent) < 0)
                                    obj.parents.push(concept.parent)

                                /*  if (thesaurusTerm.text) {
                                      thesaurusTerm.data.synonyms.forEach(function (concept) {
                                          if (!obj.concepts)
                                              obj.concepts = [];
                                          if (obj.concepts.indexOf(concept) < 0) {
                                              obj.concepts.push(concept);

                                              // console.log(noun.lemma+" : "+concept.text)
                                          }

                                      })
                                  }*/


                            })
                            terms.push(obj);
                            callback(null);

                        })


                    },
                    function (err) {
                        self.currentQuestionTerms = terms;
                        self.showQuestionProposal(terms);
                    })
                var xx = terms;


            })
        }


        self.searchElastic = function () {
            $("#answersDiv").html("");
            var allResults = [];
            var maxIterations = 20;
            var iteration = 0
            var associations = self.getWordsAssociations();

            async.eachSeries(associations, function (association, callbackAssociation) {

                var queryString = ""
                association.forEach(function (term, indexTerm) {
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

                })
                console.log(queryString)
                if(queryString=="")
                    callbackAssociation();
                self.elasticQuery("totalreferentiel3", queryString, null, function (err, elasticResults) {
                    if (!elasticResults || elasticResults.length == 0)
                        callbackAssociation();

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
                        callbackAssociation();
                    else
                        callbackAssociation("end");


                })


            }, function (err) {
                self.showSearchResults(allResults);
                //  console.log(JSON.stringify(allResults,null,2));
            })

        }


        self.elasticQuery = function (index, terms, field, callback) {

            var payload = {

                index: index,
                queryString: terms,
                size: 10,
                field: field

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

                str += "<tr><td>" + termObj.term + "<td><td>";
                if (termObj.concepts) {
                    str += "<select class='questionItem questionConcept' style='color :green;font-weight: bold'><option>" + "" + "</option><option></option>";
var selected=false;

                    termObj.concepts.forEach(function (concept) {
                        if(concept.toLowerCase()==termObj.term.toLowerCase())
                            selected="selected='selected'";
                        str += "<option "+selected+">" + concept + "</option>"
                    })
                    str += "</select>"
                }
                else {
                    str += "<input class='questionItem questionWord' value='" + termObj.term + "'/>";
                }

                str += "</td>";

                str += "<td>";
                str += "<select class='questionItem conceptConceptParent'>"
                termObj.parents.forEach(function (parent) {
                    str += "<option>" + parent + "</option>"
                })
                str += "</select>"
                str += "</td>";
                str += "</tr>"

            })
            str += "</table>";


            $("#QuestionConceptsInput").html(str);
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
)()
