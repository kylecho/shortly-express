var db = require('../config');
var Click = require('./click');
var crypto = require('crypto');

var Link = db.Model.extend({
  tableName: 'urls',
  hasTimestamps: true,
  defaults: {
    visits: 0
  },
  clicks: function() {
    return this.hasMany(Click);
  },
  user: function() {
    return this.belongsTo(User, 'user_id');
  },
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      var shasum = crypto.createHash('sha1'); // creating short url
      shasum.update(model.get('url'));
      model.set('code', shasum.digest('hex').slice(0, 5));
    });
  }
});

module.exports = Link;
