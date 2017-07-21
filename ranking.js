var request = require('request');
// gives me jquery ability
var cheerio = require('cheerio');

var exports = module.exports = {};
var rankings = new Array(12);

exports.getRankings = function () {
    url = 'http://www.ufc.com/rankings';
    request(url, function (error, response, html) {
        if (!error) {
            let $ = cheerio.load(html);
            // disregard everything but the rankings
            $('#ranking-lists').filter(function () {
                var data = $(this);
                $('.ranking-list').each(function (i, elem) {
                    // get rid of the extra whitespace from the website
                    let weight = $(this).find('.weight-class-name').text().toString();
                    weight = weight.replace(/\r?\n|\r/g, "");
                    weight = weight.replace(/\r?\t|\r/g, "");

                    let champ = $(this).find('#champion-fighter-name').children().first().text();
                    let fighters = new Array(15);
                    fighters[0] = champ;

                    let table = $(this).find('.rankings-table').children().children().html();

                    // since each weight class has a table, i had to make sure I went through
                    // each element of each table.
                    $(this).find('.rankings-table .name-column').each(function (j, elem) {
                        let fighter = $(this).children().first().text();
                        fighter = fighter.replace(/\r?\n|\r/g, "");
                        fighter = fighter.replace(/\r?\t|\r/g, "");
                        // since champ will be index 0, i needed to move all of the fighters up one
                        fighters[j + 1] = fighter;
                    });

                    rankings[i] = { weightClass: weight, fighter: fighters };
                });
            });
        }
    })
}