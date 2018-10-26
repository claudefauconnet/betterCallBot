var AdaptiveCards = require("adaptivecards");
var  adaptativeCardRenderer={





    render:function(card){


// Create an AdaptiveCard instance
        var adaptiveCard = new AdaptiveCards.AdaptiveCard();

// Set its hostConfig property unless you want to use the default Host Config
// Host Config defines the style and behavior of a card
        adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
            fontFamily: "Segoe UI, Helvetica Neue, sans-serif"
            // More host config options
        });

// Set the adaptive card's event handlers. onExecuteAction is invoked
// whenever an action is clicked in the card
        adaptiveCard.onExecuteAction = function(action) { alert("Ow!"); }

// For markdown support you need a third-party library
// E.g., to use markdown-it, include in your HTML page:
//     <script type="text/javascript" src="https://unpkg.com/markdown-it/dist/markdown-it.js"></script>
// And add this code to replace the default markdown handler:
//     AdaptiveCards.processMarkdown = function(text) { return markdownit().render(text); }

// Parse the card payload
        adaptiveCard.parse(card);

// Render the card to an HTML element:
        var renderedCard = adaptiveCard.render();
// And finally insert it somewhere in your page:
     //   document.body.appendChild(renderedCard);
return renderedCard;












    }



}

module.exports=adaptativeCardRenderer;

var card = {
    "type": "AdaptiveCard",
    "version": "1.0",
    "body": [
        {
            "type": "Image",
            "url": "http://adaptivecards.io/content/adaptive-card-50.png"
        },
        {
            "type": "TextBlock",
            "text": "Hello **Adaptive Cards!**"
        }
    ],
    "actions": [
        {
            "type": "Action.OpenUrl",
            "title": "Learn more",
            "url": "http://adaptivecards.io"
        },
        {
            "type": "Action.OpenUrl",
            "title": "GitHub",
            "url": "http://github.com/Microsoft/AdaptiveCards"
        }
    ]
};

//var html=adaptativeCardRenderer.render(card)