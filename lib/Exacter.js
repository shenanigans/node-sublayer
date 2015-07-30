
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
            self.DomainCollection.update (
                { _id:domain },
                { $inc:dropped },
                function (err) {
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
function excise (domain, bytes) {
    if (Object.hasOwnProperty.call (this.cache, domain)) {
        this.cache[domain].bandwidth += bytes;
        return;
    }

    this.cache[domain] = {
        bandwidth:  bytes,
        actions:    0
    };
}

/**     @property/Function action
    Charge for a performed action.
*/
function action (domain, tax) {
    if (Object.hasOwnProperty.call (this.cache, domain)) {
        this.cache[domain].actions += tax;
        return;
    }

    this.cache[domain] = {
        bandwidth:  0,
        actions:    tax
    };
}
