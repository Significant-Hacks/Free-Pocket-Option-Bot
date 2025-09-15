(() => {
    "use strict";
    const t = {
        settings: {
            strategy: "signals",
            min_profit: 80,
            delay: 0,
            deals_limit: 10,
            take_profit: {
                percent: 20,
                sum: 0
            },
            signals: [2, 2, 1, 0, 0, 0],
            use_otc: true,
            started: false,
            martinSteps: [2, 2, 2, 2, 2, 2, 2, 2, 2],
            useMartin: false
        },
        rates: {},
        action: false,
        userInfo: {
            uid: false,
            isDemo: true,
            balance: {
                demo: 0,
                real: 0
            },
            openedDials: 0,
            futureDeals: [],
            onlyDemo: true,
            robotDeals: {
                opened: [],
                closed: []
            },
            startSum: false
        },

        getNextMartingaleStep(t, e) {
            let s = t;
            for (let t = 0; t < this.settings.martinSteps.length; t++) {
                if (e === s) {
                    return Math.floor(s * this.settings.martinSteps[t] * 100) / 100;
                }
                s = Math.floor(this.settings.martinSteps[t] * s * 100) / 100;
            }
            return 2 * e;
        },

        checkDial(e, s) {
            if (!this.settings.started) return false;
            if ("otc" == e.slice(-3) && !this.settings.use_otc) return false;
            if (!this.rates[e].active) return false;
            if (this.userInfo.openedDials + this.userInfo.futureDeals.length >= this.settings.deals_limit) return false;
            if (this.rates[e].nextDealTime > new Date) return false;
            if (this.rates[e].profit < this.settings.min_profit) return false;

            if (this.userInfo.isDemo && this.userInfo.balance.demo >= this.settings.take_profit.sum) {
                this.settings.started = false;
                window.postMessage({
                    belobot: true,
                    act: "robotSettings",
                    settings: t.settings
                }, window.location.href);
                return false;
            }

            if (!this.userInfo.isDemo && this.userInfo.balance.real >= this.settings.take_profit.sum) {
                this.settings.started = false;
                window.postMessage({
                    belobot: true,
                    act: "robotSettings",
                    settings: t.settings
                }, window.location.href);
                return false;
            }

            if ("updateStream" == this.action) {
                if ("candles" == this.settings.strategy) {
                    let t = this.strategies.candles(this.rates[e].rates, Math.trunc(s), 4);
                    t && ("down" == t ? this.deal(e, "up") : this.deal(e, "down"));
                }

                if ("cci" == this.settings.strategy) {
                    let t = this.strategies.cci(this.rates[e].rates, Math.trunc(s), 20);
                    t && (
                        t < 115 && this.rates[e].last_cci > 115 && this.deal(e, "down"),
                        t > -105 && this.rates[e].last_cci < -105 && this.deal(e, "up"),
                        this.rates[e].last_cci = t
                    );
                }

                if ("pinBar" == this.settings.strategy) {
                    let t = this.strategies.pinBar(this.rates[e].rates, Math.trunc(s), 4);
                    t && this.deal(e, t);
                }
            }

            if ("signals" == this.action && "signals" == this.settings.strategy) {
                let t = this.strategies.signals(this.rates[e].signals, this.settings.signals);
                t && this.deal(e, t);
            }
        },

        check_reg(t) {
            var e = this,
                s = new XMLHttpRequest;
            s.open("POST", "https://2bot.top/check_user/", true);
            s.setRequestHeader("Content-type", "application/json; charset=utf-8");
            s.onreadystatechange = function() {
                if (s.readyState == XMLHttpRequest.DONE) {
                    if (200 == s.status) {
                        var t = JSON.parse(s.response);
                        t.confirm ? e.userInfo.onlyDemo = false : e.userInfo.onlyDemo = true;
                        window.postMessage({
                            belobot: true,
                            info_text: t.message
                        });
                    } else {
                        window.postMessage({
                            belobot: true,
                            info_text: 'Server <a href="https://2bot.top">https://2bot.top</a> is not available. Please report a problem trader.vitaly@gmail.com'
                        });
                    }
                }
            };
            s.send(JSON.stringify({
                user_id: t
            }));
        },

        deal(t, e, s) {
            e = "up" == e ? "call" : "put";
            this.userInfo.futureDeals.push({
                pair: t,
                dur: e,
                sum: s
            });
            let a = new Date;
            a.setSeconds(a.getSeconds() + this.settings.delay);
            this.rates[t].nextDealTime = a;
            window.postMessage({
                belobot: true,
                act: "newDeal"
            }, window.location.href);
        },

        addRate(t) {
            this.rates[t.name].rates[t.elm[0]] = [t.elm[1], t.elm[2], t.elm[3], t.elm[4]];
        },

        addCurrentRate(t) {
            var e = 60 * parseInt(t.elm[0] / 60);
            this.checkRate(t.name);
            if (null == this.rates[t.name].rates[e]) {
                this.rates[t.name].rates[e] = [t.elm[1], t.elm[1], t.elm[1], t.elm[1]];
            }
            if (t.elm[1] > this.rates[t.name].rates[e][2]) {
                this.rates[t.name].rates[e][2] = t.elm[1];
            } else if (t.elm[1] < this.rates[t.name].rates[e][3]) {
                this.rates[t.name].rates[e][3] = t.elm[1];
            }
            this.rates[t.name].rates[e][1] = t.elm[1];
        },

        checkRate(t) {
            if (null == this.rates[t]) {
                this.rates[t] = {
                    rates: {}
                };
            }
            if (null == this.rates[t].signals) {
                this.rates[t].signals = {};
            }
            if (null == this.rates[t].nextDealTime) {
                this.rates[t].nextDealTime = new Date;
            }
            if (null == this.rates[t].last_cci) {
                this.rates[t].last_cci = false;
            }
        },

        update(e) {
            if ("updateHistory" == this.action) {
                this.checkRate(e.asset);
                e.candles.forEach(function(t) {
                    this.addRate({
                        name: e.asset,
                        elm: t
                    });
                }, this);
                e.history.forEach(function(t) {
                    this.addCurrentRate({
                        name: e.asset,
                        elm: t
                    });
                }, this);
            }

            if ("updateStream" == this.action) {
                e.forEach(function(t) {
                    this.checkRate(t[0]);
                    this.addCurrentRate({
                        name: t[0],
                        elm: [t[1], t[2]]
                    });
                    this.checkDial(t[0], t[1]);
                }, this);
            }

            if ("updateAssets" == this.action) {
                e.forEach(function(t) {
                    this.checkRate(t[1]);
                    this.rates[t[1]].profit = t[5];
                    this.rates[t[1]].active = t[14];
                    this.rates[t[1]].fullname = t[2];
                }, this);
            }

            if ("updateBalance" == this.action) {
                if (!this.userInfo.uid) {
                    this.userInfo.uid = AppData.uid;
                    this.check_reg(this.userInfo.uid);
                }
                if (e.isDemo) {
                    this.userInfo.balance.demo = e.balance;
                } else {
                    this.userInfo.balance.real = e.balance;
                }
                this.userInfo.isDemo = e.isDemo;
            }

            if ("updateOpenedDeals" === this.action) {
                this.userInfo.openedDials = e.length;
            }

            if ("successopenOrder" === this.action && this.settings.started) {
                this.userInfo.robotDeals.opened.push(e.id);
            }

            if ("successcloseOrder" === this.action) {
                e.deals.forEach(function(t) {
                    var e = this.userInfo.robotDeals.opened.indexOf(t.id);
                    if (e > -1) {
                        this.userInfo.robotDeals.opened.splice(e, 1);
                        this.userInfo.robotDeals.closed.push(t.profit);
                        if (("martin" === this.settings.strategy || this.settings.useMartin) && this.settings.started) {
                            if (t.profit < 0) {
                                let e = this.getNextMartingaleStep(this.userInfo.startSum, t.amount);
                                if (0 == t.command) {
                                    this.deal(t.asset, "up", e);
                                } else {
                                    this.deal(t.asset, "down", e);
                                }
                            }
                            if (0 == t.profit) {
                                if (0 == t.command) {
                                    this.deal(t.asset, "up", t.amount);
                                } else {
                                    this.deal(t.asset, "down", t.amount);
                                }
                            }
                        }
                    }
                    this.userInfo.openedDials--;
                }, this);
                window.postMessage({
                    belobot: true,
                    robotDeals: t.userInfo.robotDeals
                }, window.location.href);
            }

            if ("signals" === this.action) {
                e.signals.forEach(function(t) {
                    this.checkRate(t[0]);
                    t[1].forEach(function(e) {
                        this.rates[t[0]].signals[e[0]] = e[1];
                    }, this);
                    this.checkDial(t[0]);
                }, this);
            }

            this.action = false;
            return false;
        },

        getState() {
            window.postMessage({
                belobot: true,
                data: {
                    settings: this.settings
                }
            }, window.location.href);
        },

        setState(t) {
            for (var e in t) {
                this.settings = t[e];
            }
        },

        strategies: {
            cci: function(t, e, s) {
                if (t.length < s) return false;
                let a = [],
                    i = 60 * parseInt(e / 60);
                for (let e = i - 60 * (s - 1); e <= i; e += 60) {
                    a.push(t[e]);
                }
                const n = a.map(t => (t[0] + t[2] + t[3] + t[1]) / 4);
                const r = n.reduce((t, e) => t + e, 0) / s;
                const o = n.reduce((t, e) => t + Math.abs(e - r), 0) / s;
                return (n[s - 1] - r) / (0.02 * o);
            },

            candles: function(t, e, s) {
                var a = false;
                for (let i = 0, n = 60 * parseInt(e / 60); i <= s; i++, n -= 60) {
                    if (null == t[n]) return false;
                    if (t[n][0] == t[n][1]) return false;
                    if (t[n][0] < t[n][1]) {
                        if (a) {
                            if ("down" == a) return false;
                        } else {
                            a = "up";
                        }
                    }
                    if (t[n][0] > t[n][1]) {
                        if (a) {
                            if ("up" == a) return false;
                        } else {
                            a = "down";
                        }
                    }
                }
                return a;
            },

            pinBar: function(t, e, s) {
                let a = 60 * parseInt(e / 60);
                let i = new Date(1000 * e).getSeconds();
                let n = t[a];
                if (i < 40) return false;
                const r = Math.abs(n[1] - n[0]);
                const o = n[2] - Math.max(n[0], n[1]);
                const l = Math.min(n[0], n[1]) - n[3];
                return o > l && o > r * s ? "down" : o < l && l > r * s && "up";
            },

            signals: function(t, e) {
                let s = [t[1], t[2], t[3], t[5], t[10], t[15]];
                let a = false;
                for (var i = 0; i < s.length; i++) {
                    if (0 != e[i]) {
                        if (s[i] > 0) {
                            if (s[i] > 2) {
                                if ("up" == a) return false;
                                if (!a) a = "down";
                                s[i] -= 2;
                            } else {
                                if ("down" == a) return false;
                                if (!a) a = "up";
                            }
                        }
                        if (s[i] < e[i]) return false;
                    }
                }
                return a;
            }
        }
    };

    const e = t;

    // Message Event Listener
    window.addEventListener("message", function(t) {
        if (t.data.belobot) {
            if ("readState" == t.data.act) {
                window.postMessage({
                    belobot: true,
                    act: "robotSettings",
                    settings: e.settings
                }, window.location.href);
            }

            if ("setState" == t.data.act) {
                for (let s in t.data.settings) {
                    if ("take_profit" == s) {
                        e.settings.take_profit.percent = t.data.settings[s];
                    } else {
                        e.settings[s] = t.data.settings[s];
                    }
                }
            }

            if ("start_stop" == t.data.act) {
                if (!e.userInfo.isDemo && e.userInfo.onlyDemo) return false;
                if (e.userInfo.isDemo) {
                    e.settings.take_profit.sum = Math.floor(e.userInfo.balance.demo * (e.settings.take_profit.percent + 100) / 100);
                } else {
                    e.settings.take_profit.sum = Math.floor(e.userInfo.balance.real * (e.settings.take_profit.percent + 100) / 100);
                }
                e.settings.started = !e.settings.started;
                e.userInfo.futureDeals = [];
                if (!e.settings.started) {
                    window.postMessage({
                        belobot: true,
                        robotDeals: e.userInfo.robotDeals
                    }, window.location.href);
                }
            }
        }
    });

    // WebSocket Override
    var s = window.WebSocket;
    window.WebSocket = function(t, a) {
        var i = a ? new s(t, a) : new s(t);

        i.addEventListener("open", function(t) {});

        i.addEventListener("message", function(t) {
            if (t.data instanceof ArrayBuffer && e.action) {
                let a = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(t.data)));
                e.update(a);
            } else if (t.data.length > 6) {
                try {
                    let s = JSON.parse(t.data.slice(4));
                    if ("updateHistoryNew" === s[0]) {
                        e.action = "updateHistory";
                    } else if ("updateStream" === s[0]) {
                        e.action = "updateStream";
                    } else if ("updateAssets" === s[0]) {
                        e.action = "updateAssets";
                    } else if ("successupdateBalance" === s[0]) {
                        e.action = "updateBalance";
                    } else if ("updateOpenedDeals" === s[0]) {
                        e.action = "updateOpenedDeals";
                    } else if ("successopenOrder" === s[0]) {
                        e.action = "successopenOrder";
                    } else if ("successcloseOrder" === s[0]) {
                        e.action = "successcloseOrder";
                    } else if ("upsignals" === s[0] || "updateSignalForecast" === s[0] || "signals/load" === s[0] || "signals/update" === s[0]) {
                        e.action = "signals";
                    }
                } catch {}
            }
        });

        i.addEventListener("send", function(t) {});

        i.oldSend = s.prototype.send;
        i.send = function(t) {
            if (e.settings.started && (e.userInfo.futureDeals.length > 0 || !e.userInfo.startSum) && "[" == t[2]) {
                try {
                    var s = JSON.parse(t.slice(2));
                    var a = e.userInfo.futureDeals.pop();
                    var n = t.slice(0, 2);
                    e.userInfo.startSum = s[1].amount;
                    s[1].asset = a.pair;
                    s[1].action = a.dur;
                    if (a.sum) {
                        s[1].amount = a.sum;
                    }
                    if (e.userInfo.onlyDemo) {
                        s[1].isDemo = 1;
                    }
                    n += JSON.stringify(s);
                    e.userInfo.openedDials++;
                    i.oldSend.apply(this, [n]);
                } catch {
                    i.oldSend.apply(this, [t]);
                }
            } else {
                i.oldSend.apply(this, [t]);
            }
        };

        return i;
    }
})();
