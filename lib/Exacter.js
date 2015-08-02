
var mongodb = require ('mongodb');
var filth = require ('filth');
var cachew = require ('cachew');

var DEFAULT_CONFIG = {
    batchTimeout:   1000 * 5,
    releaseBatch:   1000 * 60,
    batchCharges:   20480
};


/**     @module/class sublayer:Exacter
    Sends batched Action and Bandwidth dues updates to the database.
*/
function Exacter (parent, config) {
    this.parent = parent;
    this.config = filth.clone (DEFAULT_CONFIG);
    if (config)
        filth.merge (this.config, config);

    var self = this;
    this.cache = new cachew.LimitDropCache (
        this.config.batchTimeout,
        this.config.releaseBatch,
        this.config.batchCharges,
        function sendUpdate (domain, dropped, tries) {
            if (!tries) tries = 0;
            self.DomainCollection.findAndModify (
                { domain:domain },
                { $inc:dropped },
                function (err, domain) {
                    if (err) {
                        if (tries++ < 3)
                            sendUpdate (domain, dropped, tries);
                        else
                            self.parent.logger.error ({
                                err:        err,
                                domain:     domain,
                                charges:    dropped
                            }, 'failed to charge domain activity');
                        return;
                    }
                    parent.sendEvent (
                        domain.owner,
                        [
                            'domainStatus',
                            undefined,
                            dropped.bandwidth,
                            dropped.actions,
                            dropped.events
                        ]
                    );
                }
            );
        }
    );
}
module.exports = Exacter;


/**     @member/Function init
    Prepares this Exacter for use.
*/
Exacter.prototype.init = function (callback) {
    this.DomainCollection = this.parent.DomainCollection;
    callback();
};


/**     @property/Function excise
    Charge for outgoing bandwidth.
*/
Exacter.prototype.excise = function (domain, bytes) {
    var cached = this.cache.get (domain);
    if (cached) {
        cached.bandwidth += bytes;
        return;
    }

    this.cache.set (domain, {
        bandwidth:  bytes,
        actions:    0,
        events:     0
    });
}


/**     @property/Function action
    Charge for a performed action.
*/
Exacter.prototype.action = function (domain) {
    var cached = this.cache.get (domain);
    if (cached) {
        cached.actions++;
        return;
    }

    this.cache.set (domain, {
        bandwidth:  0,
        actions:    1,
        events:     0
    });
}


/**     @property/Function action
    Charge for an event sent to connected clients.
*/
Exacter.prototype.action = function (domain) {
    var cached = this.cache.get (domain);
    if (cached) {
        cached.events++;
        return;
    }

    this.cache.set (domain, {
        bandwidth:  0,
        actions:    0,
        events:     1
    });
}
