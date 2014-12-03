
// NOW PLAYING ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app         = require('../../app'),
    Fluff       = app.Fluff,
    Plug        = require('./plug'),
    resource    = require('../../routes/resource'),
    watchlist   = require('./watchlist'),
    aws         = require('./aws-lib-0.2.1/lib/aws');

var schema = "{\n\
  user_id        : ObjectId,                          // The owner.\n\
  seriesname     : { type: String, required: true},   // No notes.\n\
  seasonname     : String,                            // No notes.\n\
  seasonnumber   : String,                            // No notes.\n\
  episodename    : String,                            // No notes.\n\
  episodenumber  : String,                            // No notes.\n\
  asin           : { type: String, required: true},   // No notes.\n\
  seriesasin     : { type: String, required: true},   // No notes.\n\
  seasonasin     : String,                            // No notes.\n\
  imageurl       : String,                            // No notes.\n\
  pageurl        : String,                            // No notes.\n\
  networkname    : String,                            // The cable or TV network.\n\
  releasedate    : { type: String, required: true},   // Release date.\n\
  creator_id     : ObjectId,                          // Required by Fluff.\n\
  lastupdater_id : ObjectId,                          // Required by Fluff.\n\
  creation       : { type: Date, default: Date.now }, // Required by Fluff.\n\
  lastupdate     : { type: Date, default: Date.now }  // Required by Fluff.\n\
}";

var display_columns = [{
  name:  'networkname',
  title: 'Network',
  size:  20
},
{
  name:  'seriesname',
  title: 'Series',
  size:  20
},
{
  name:  'imageurl',
  title: 'Image',
  type: 'image',
  size:  20
},
{
  name:  'seasonnumber',
  title: 'Season Number',
  size:  10
},
{
  name:  'episodenumber',
  title: 'Episode Number',
  size:  10
},
{
  name:  'episodename',
  title: 'Episode Name',
  size:  20
},
{
  name:  'releasedate',
  title: 'Release Date',
  size:  20
},
{
  name:  'pageurl',
  title: 'Page',
  size:  20
},
{
  name:  'asin',
  title: 'ID',
  size:  20
}];

var sort_column = { name:'releasedate', order:false };

// These are used in plug.js
exports.match_fields = ['seriesname'];
exports.schema = schema;

// Preprocessor for GET /nowplaying
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, function(req, res, resourceScope) {
    var filter = {user_id: req.session.user.id};
    var sort = '-releasedate';
    resource.find(req, res, resourceScope, filter, null, sort);
  });
};

// Preprocessor for GET /nowplaying/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, function(req, res) {
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column
    }
    res.json(data);
  });
};

// Preprocessor for GET /nowplaying/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, resource.findone);
};

// Preprocessor for POST /nowplaying/refresh
exports.refresh = function(req, res){
  Plug.Watchlist.find({user_id: req.session.user.id}).exec(function (err, watchlist) {
    if (err) {
      app.msgResponse(req, res, 500, 'Could not get the watchlist.');
    }
    else {
      Plug.NowPlaying.remove({user_id: req.session.user.id}, function (err, data) {
        if (err) {
          app.msgResponse(req, res, 500, 'Could not clear the now playing list.');
        }
        else { 
          if (watchlist && watchlist.length > 0) {
            var asins = watchlist.map(function(item){
              return item.asin;
            });
            asyncLoop.start({
              array: asins,
              onloop: nowPlayingLoop,
              step: 10,
              callback: function () {
                console.log('LOOP DONE');
              }
            });
            res.json({
              msg: "Refresh started, see 'wait' value for expected wait time in seconds.",
              wait: watchlist.length * 1.5
            });
          }
          else {
            app.msgResponse(req, res, 200, 'Nothing in the watchlist yet.');
          }
        }
      });
    }
  });
};

// A generic asynchronous control loop
var asyncLoop = {
  // Loop start
  start: function (options) {
    options.index = options.index ? options.index : 0;
    options.onloop(options);
  },
  // Loop iteration
  next: function (options) {
    // Delay on each set of requests for a rate limited function or API
    options.delay = options.delay ? options.delay : 1500;
    // If there are more items left, do the next
    if ((options.index != undefined) && (options.array.length > (options.index + options.step))) {
      setTimeout(function () {
        options.index = options.index + options.step;
        options.onloop(options);
      }, options.delay);
    }
    else {
      // This is called at the end of the loop
      if (options.callback) {
        options.callback();
      }
    }
  }
};

// Records the last released episode for each series in an array of series asins
var nowPlayingLoop = function(options){
  if (options) {
    var seriesASINs = options.array.slice(options.index, options.index + options.step);
    var nowPlayingItems = seriesASINs.map(function (asin) {
      return {seriesasin: asin};
    });
    console.log('Now playing loop on ASINs: ' + JSON.stringify(seriesASINs));
    var prodAdv = aws.createProdAdvClient(Fluff.awsAccessKeyId, Fluff.awsSecretAccessKey, Fluff.awsAssociatesId);
    prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: seriesASINs.join(","), ResponseGroup: "ItemAttributes, RelatedItems", RelationshipType: "Season"}, function(err, result) {
      if (result.ItemLookupResponse) {
        var seasonASINs = [];
        result.ItemLookupResponse.Items[0].Item.forEach(function (item) {
          var seriesName = item.ItemAttributes[0].Title[0];
          console.log('Got series lookup response for ' + seriesName);
          // Check if the series has any seasons
          var latestSeason = 0, latestSeasonASIN = null;
          item.RelatedItems.forEach(function (relateditem) {
            if ((relateditem.Relationship[0] == "Children") && 
              (relateditem.RelationshipType[0] == "Season")) {
              relateditem.RelatedItem.forEach(function (season) {
                if (parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]) &&
                  (parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]) > latestSeason)) {
                  latestSeason = parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]);
                  latestSeasonASIN = season.Item[0].ASIN[0];
                }
              });
            }
          });
          if (latestSeason == 0) {
            console.log('NO latest season for ' + seriesName + ' ' + item.ASIN[0]);
            asyncLoop.next(options);
          }
          else {
            seasonASINs.push(latestSeasonASIN);
            nowPlayingItems.forEach(function (npitem, index) {
              if (item.ASIN[0] == npitem.seriesasin) {
                nowPlayingItems[index].seriesname   = seriesName;
                nowPlayingItems[index].seasonasin   = latestSeasonASIN;
                nowPlayingItems[index].seasonnumber = latestSeason;
              }
            });
          }
        });
        console.log('Got latest seasons');
        prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: seasonASINs.join(","), ResponseGroup: "ItemAttributes, RelatedItems", RelationshipType: "Episode"}, function(err, result) {
          if (result.ItemLookupResponse) {
            var episodeASINs = [];
            result.ItemLookupResponse.Items[0].Item.forEach(function (item) {
              var seasonName = item.ItemAttributes[0].Title[0];
              console.log('Got season lookup response for ' + seasonName);

              // Check bonanza season 2 and NYPD blue season 12 for data issues
              // Check if the season has any episodes
              var latestEpisodeDate = '0000-00-00', latestEpisodeASIN = null;
              item.RelatedItems.forEach(function (relateditem) {
                if ((relateditem.Relationship[0] == "Children") && 
                  (relateditem.RelationshipType[0] == "Episode")) {
                  relateditem.RelatedItem.forEach(function (episode) {
                    console.log("Episode for " + seasonName + ": " + episode.Item[0].ItemAttributes[0].ReleaseDate[0]);
                    if (episode.Item[0].ItemAttributes[0].ReleaseDate[0] &&
                      (episode.Item[0].ItemAttributes[0].ReleaseDate[0] > latestEpisodeDate)) {
                      latestEpisodeDate = episode.Item[0].ItemAttributes[0].ReleaseDate[0];
                      latestEpisodeASIN = episode.Item[0].ASIN[0];
                    }
                  });
                }
              });
              if (latestEpisodeDate == '0000-00-00') {
                console.log('NO latest episode for ' + seasonName + ' ' + item.ASIN[0]);
                asyncLoop.next(options);
              }
              else {
                episodeASINs.push(latestEpisodeASIN);
                nowPlayingItems.forEach(function (npitem, index) {
                  if (item.ASIN[0] == npitem.seasonasin) {
                    nowPlayingItems[index].seasonname  = seasonName;
                    nowPlayingItems[index].asin        = latestEpisodeASIN;
                    nowPlayingItems[index].releasedate = latestEpisodeDate;
                  }
                });
              }
            });
            console.log('Got latest episodes');
            console.log('looking up episodes: ' + episodeASINs.join(","));
            prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: episodeASINs.join(","), ResponseGroup: "ItemAttributes, Images"}, function(err, result) {
              if (result.ItemLookupResponse) {
                result.ItemLookupResponse.Items[0].Item.forEach(function (item) {
                  console.log('Got episode lookup response for ' + item.ASIN[0]);
                  nowPlayingItems.forEach(function (npitem, index) {
                    if (item.ASIN[0] == npitem.asin) {
                      nowPlayingItems[index].networkname   = item.ItemAttributes[0].Studio[0];
                      nowPlayingItems[index].episodenumber = item.ItemAttributes[0].EpisodeSequence[0];
                      nowPlayingItems[index].episodename   = item.ItemAttributes[0].Title[0];
                      nowPlayingItems[index].imageurl      = item.SmallImage[0].URL[0];
                      nowPlayingItems[index].pageurl       = item.DetailPageURL[0];
                      nowPlayingItems[index].user_id       = req.session.user.id;
                    }
                  });
                  console.log('SAVING NOWPLAYING ITEMS');
                });
                Plug.NowPlaying.create(nowPlayingItems, function (err, data) {
                  asyncLoop.next(options);
                });
              }
              else {
                console.log('NO episode lookup response');
                console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
                asyncLoop.next(options);
              }
            });
          }
          else {
            console.log('NO season lookup response');
            console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
            asyncLoop.next(options);
          }
        });
      }
      else {
        console.log('NO series lookup response');
        console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
        asyncLoop.next(options);
      }
    });
  }
  else {
    console.log('No ARRAY for nowPlayingLoop.');
    asyncLoop.next(options);
  }
};
