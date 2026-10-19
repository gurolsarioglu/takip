(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,548032,(e,t,r)=>{e.e,t.exports=function(){"use strict";var e="millisecond",t="second",r="minute",n="hour",o="week",a="month",i="quarter",l="year",s="date",c="Invalid Date",u=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,d=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,p=function(e,t,r){var n=String(e);return!n||n.length>=t?e:""+Array(t+1-n.length).join(r)+e},f="en",m={};m[f]={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(e){var t=["th","st","nd","rd"],r=e%100;return"["+e+(t[(r-20)%10]||t[r]||t[0])+"]"}};var h="$isDayjsObject",g=function(e){return e instanceof v||!(!e||!e[h])},y=function e(t,r,n){var o;if(!t)return f;if("string"==typeof t){var a=t.toLowerCase();m[a]&&(o=a),r&&(m[a]=r,o=a);var i=t.split("-");if(!o&&i.length>1)return e(i[0])}else{var l=t.name;m[l]=t,o=l}return!n&&o&&(f=o),o||!n&&f},b=function(e,t){if(g(e))return e.clone();var r="object"==typeof t?t:{};return r.date=e,r.args=arguments,new v(r)},x={s:p,z:function(e){var t=-e.utcOffset(),r=Math.abs(t);return(t<=0?"+":"-")+p(Math.floor(r/60),2,"0")+":"+p(r%60,2,"0")},m:function e(t,r){if(t.date()<r.date())return-e(r,t);var n=12*(r.year()-t.year())+(r.month()-t.month()),o=t.clone().add(n,a),i=r-o<0,l=t.clone().add(n+(i?-1:1),a);return+(-(n+(r-o)/(i?o-l:l-o))||0)},a:function(e){return e<0?Math.ceil(e)||0:Math.floor(e)},p:function(c){return({M:a,y:l,w:o,d:"day",D:s,h:n,m:r,s:t,ms:e,Q:i})[c]||String(c||"").toLowerCase().replace(/s$/,"")},u:function(e){return void 0===e}};x.l=y,x.i=g,x.w=function(e,t){return b(e,{locale:t.$L,utc:t.$u,x:t.$x,$offset:t.$offset})};var v=function(){function p(e){this.$L=y(e.locale,null,!0),this.parse(e),this.$x=this.$x||e.x||{},this[h]=!0}var f=p.prototype;return f.parse=function(e){this.$d=function(e){var t=e.date,r=e.utc;if(null===t)return new Date(NaN);if(x.u(t))return new Date;if(t instanceof Date)return new Date(t);if("string"==typeof t&&!/Z$/i.test(t)){var n=t.match(u);if(n){var o=n[2]-1||0,a=(n[7]||"0").substring(0,3);return r?new Date(Date.UTC(n[1],o,n[3]||1,n[4]||0,n[5]||0,n[6]||0,a)):new Date(n[1],o,n[3]||1,n[4]||0,n[5]||0,n[6]||0,a)}}return new Date(t)}(e),this.init()},f.init=function(){var e=this.$d;this.$y=e.getFullYear(),this.$M=e.getMonth(),this.$D=e.getDate(),this.$W=e.getDay(),this.$H=e.getHours(),this.$m=e.getMinutes(),this.$s=e.getSeconds(),this.$ms=e.getMilliseconds()},f.$utils=function(){return x},f.isValid=function(){return this.$d.toString()!==c},f.isSame=function(e,t){var r=b(e);return this.startOf(t)<=r&&r<=this.endOf(t)},f.isAfter=function(e,t){return b(e)<this.startOf(t)},f.isBefore=function(e,t){return this.endOf(t)<b(e)},f.$g=function(e,t,r){return x.u(e)?this[t]:this.set(r,e)},f.unix=function(){return Math.floor(this.valueOf()/1e3)},f.valueOf=function(){return this.$d.getTime()},f.startOf=function(e,i){var c=this,u=!!x.u(i)||i,d=x.p(e),p=function(e,t){var r=x.w(c.$u?Date.UTC(c.$y,t,e):new Date(c.$y,t,e),c);return u?r:r.endOf("day")},f=function(e,t){return x.w(c.toDate()[e].apply(c.toDate("s"),(u?[0,0,0,0]:[23,59,59,999]).slice(t)),c)},m=this.$W,h=this.$M,g=this.$D,y="set"+(this.$u?"UTC":"");switch(d){case l:return u?p(1,0):p(31,11);case a:return u?p(1,h):p(0,h+1);case o:var b=this.$locale().weekStart||0,v=(m<b?m+7:m)-b;return p(u?g-v:g+(6-v),h);case"day":case s:return f(y+"Hours",0);case n:return f(y+"Minutes",1);case r:return f(y+"Seconds",2);case t:return f(y+"Milliseconds",3);default:return this.clone()}},f.endOf=function(e){return this.startOf(e,!1)},f.$set=function(o,i){var c,u=x.p(o),d="set"+(this.$u?"UTC":""),p=((c={}).day=d+"Date",c[s]=d+"Date",c[a]=d+"Month",c[l]=d+"FullYear",c[n]=d+"Hours",c[r]=d+"Minutes",c[t]=d+"Seconds",c[e]=d+"Milliseconds",c)[u],f="day"===u?this.$D+(i-this.$W):i;if(u===a||u===l){var m=this.clone().set(s,1);m.$d[p](f),m.init(),this.$d=m.set(s,Math.min(this.$D,m.daysInMonth())).$d}else p&&this.$d[p](f);return this.init(),this},f.set=function(e,t){return this.clone().$set(e,t)},f.get=function(e){return this[x.p(e)]()},f.add=function(e,i){var s,c=this;e=Number(e);var u=x.p(i),d=function(t){var r=b(c);return x.w(r.date(r.date()+Math.round(t*e)),c)};if(u===a)return this.set(a,this.$M+e);if(u===l)return this.set(l,this.$y+e);if("day"===u)return d(1);if(u===o)return d(7);var p=((s={})[r]=6e4,s[n]=36e5,s[t]=1e3,s)[u]||1,f=this.$d.getTime()+e*p;return x.w(f,this)},f.subtract=function(e,t){return this.add(-1*e,t)},f.format=function(e){var t=this,r=this.$locale();if(!this.isValid())return r.invalidDate||c;var n=e||"YYYY-MM-DDTHH:mm:ssZ",o=x.z(this),a=this.$H,i=this.$m,l=this.$M,s=r.weekdays,u=r.months,p=r.meridiem,f=function(e,r,o,a){return e&&(e[r]||e(t,n))||o[r].slice(0,a)},m=function(e){return x.s(a%12||12,e,"0")},h=p||function(e,t,r){var n=e<12?"AM":"PM";return r?n.toLowerCase():n};return n.replace(d,function(e,n){return n||function(e){switch(e){case"YY":return String(t.$y).slice(-2);case"YYYY":return x.s(t.$y,4,"0");case"M":return l+1;case"MM":return x.s(l+1,2,"0");case"MMM":return f(r.monthsShort,l,u,3);case"MMMM":return f(u,l);case"D":return t.$D;case"DD":return x.s(t.$D,2,"0");case"d":return String(t.$W);case"dd":return f(r.weekdaysMin,t.$W,s,2);case"ddd":return f(r.weekdaysShort,t.$W,s,3);case"dddd":return s[t.$W];case"H":return String(a);case"HH":return x.s(a,2,"0");case"h":return m(1);case"hh":return m(2);case"a":return h(a,i,!0);case"A":return h(a,i,!1);case"m":return String(i);case"mm":return x.s(i,2,"0");case"s":return String(t.$s);case"ss":return x.s(t.$s,2,"0");case"SSS":return x.s(t.$ms,3,"0");case"Z":return o}return null}(e)||o.replace(":","")})},f.utcOffset=function(){return-(15*Math.round(this.$d.getTimezoneOffset()/15))},f.diff=function(e,s,c){var u,d=this,p=x.p(s),f=b(e),m=(f.utcOffset()-this.utcOffset())*6e4,h=this-f,g=function(){return x.m(d,f)};switch(p){case l:u=g()/12;break;case a:u=g();break;case i:u=g()/3;break;case o:u=(h-m)/6048e5;break;case"day":u=(h-m)/864e5;break;case n:u=h/36e5;break;case r:u=h/6e4;break;case t:u=h/1e3;break;default:u=h}return c?u:x.a(u)},f.daysInMonth=function(){return this.endOf(a).$D},f.$locale=function(){return m[this.$L]},f.locale=function(e,t){if(!e)return this.$L;var r=this.clone(),n=y(e,t,!0);return n&&(r.$L=n),r},f.clone=function(){return x.w(this.$d,this)},f.toDate=function(){return new Date(this.valueOf())},f.toJSON=function(){return this.isValid()?this.toISOString():null},f.toISOString=function(){return this.$d.toISOString()},f.toString=function(){return this.$d.toUTCString()},p}(),w=v.prototype;return b.prototype=w,[["$ms",e],["$s",t],["$m",r],["$H",n],["$W","day"],["$M",a],["$y",l],["$D",s]].forEach(function(e){w[e[1]]=function(t){return this.$g(t,e[0],e[1])}}),b.extend=function(e,t){return e.$i||(e(t,v,b),e.$i=!0),b},b.locale=y,b.isDayjs=g,b.unix=function(e){return b(1e3*e)},b.en=m[f],b.Ls=m,b.p={},b}()},708920,(e,t,r)=>{e.e,t.exports=function(e,t){t.prototype.weekday=function(e){var t=this.$locale().weekStart||0,r=this.$W,n=(r<t?r+7:r)-t;return this.$utils().u(e)?n:this.subtract(n,"day").add(e,"day")}}},978171,(e,t,r)=>{e.e,t.exports=function(e,t,r){var n=t.prototype,o=function(e){return e&&(e.indexOf?e:e.s)},a=function(e,t,r,n,a){var i=e.name?e:e.$locale(),l=o(i[t]),s=o(i[r]),c=l||s.map(function(e){return e.slice(0,n)});if(!a)return c;var u=i.weekStart;return c.map(function(e,t){return c[(t+(u||0))%7]})},i=function(){return r.Ls[r.locale()]},l=function(e,t){return e.formats[t]||e.formats[t.toUpperCase()].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(e,t,r){return t||r.slice(1)})},s=function(){var e=this;return{months:function(t){return t?t.format("MMMM"):a(e,"months")},monthsShort:function(t){return t?t.format("MMM"):a(e,"monthsShort","months",3)},firstDayOfWeek:function(){return e.$locale().weekStart||0},weekdays:function(t){return t?t.format("dddd"):a(e,"weekdays")},weekdaysMin:function(t){return t?t.format("dd"):a(e,"weekdaysMin","weekdays",2)},weekdaysShort:function(t){return t?t.format("ddd"):a(e,"weekdaysShort","weekdays",3)},longDateFormat:function(t){return l(e.$locale(),t)},meridiem:this.$locale().meridiem,ordinal:this.$locale().ordinal}};n.localeData=function(){return s.bind(this)()},r.localeData=function(){var e=i();return{firstDayOfWeek:function(){return e.weekStart||0},weekdays:function(){return r.weekdays()},weekdaysShort:function(){return r.weekdaysShort()},weekdaysMin:function(){return r.weekdaysMin()},months:function(){return r.months()},monthsShort:function(){return r.monthsShort()},longDateFormat:function(t){return l(e,t)},meridiem:e.meridiem,ordinal:e.ordinal}},r.months=function(){return a(i(),"months")},r.monthsShort=function(){return a(i(),"monthsShort","months",3)},r.weekdays=function(e){return a(i(),"weekdays",null,null,e)},r.weekdaysShort=function(e){return a(i(),"weekdaysShort","weekdays",3,e)},r.weekdaysMin=function(e){return a(i(),"weekdaysMin","weekdays",2,e)}}},630446,(e,t,r)=>{e.e,t.exports=function(){"use strict";var e="week",t="year";return function(r,n,o){var a=n.prototype;a.week=function(r){if(void 0===r&&(r=null),null!==r)return this.add(7*(r-this.week()),"day");var n=this.$locale().yearStart||1;if(11===this.month()&&this.date()>25){var a=o(this).startOf(t).add(1,t).date(n),i=o(this).endOf(e);if(a.isBefore(i))return 1}var l=o(this).startOf(t).date(n).startOf(e).subtract(1,"millisecond"),s=this.diff(l,e,!0);return s<0?o(this).startOf("week").week():Math.ceil(s)},a.weeks=function(e){return void 0===e&&(e=null),this.week(e)}}}()},664836,(e,t,r)=>{e.e,t.exports=function(e,t){t.prototype.weekYear=function(){var e=this.month(),t=this.week(),r=this.year();return 1===t&&11===e?r+1:0===e&&t>=52?r-1:r}}},315279,(e,t,r)=>{e.e,t.exports=function(e,t){var r=t.prototype,n=r.format;r.format=function(e){var t=this,r=this.$locale();if(!this.isValid())return n.bind(this)(e);var o=this.$utils(),a=(e||"YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g,function(e){switch(e){case"Q":return Math.ceil((t.$M+1)/3);case"Do":return r.ordinal(t.$D);case"gggg":return t.weekYear();case"GGGG":return t.isoWeekYear();case"wo":return r.ordinal(t.week(),"W");case"w":case"ww":return o.s(t.week(),"w"===e?1:2,"0");case"W":case"WW":return o.s(t.isoWeek(),"W"===e?1:2,"0");case"k":case"kk":return o.s(String(0===t.$H?24:t.$H),"k"===e?1:2,"0");case"X":return Math.floor(t.$d.getTime()/1e3);case"x":return t.$d.getTime();case"z":return"["+t.offsetName()+"]";case"zzz":return"["+t.offsetName("long")+"]";default:return e}});return n.bind(this)(a)}}},652214,(e,t,r)=>{e.e,t.exports=function(){"use strict";var e={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},t=/(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g,r=/\d/,n=/\d\d/,o=/\d\d?/,a=/\d*[^-_:/,()\s\d]+/,i={},l=function(e){return(e*=1)+(e>68?1900:2e3)},s=function(e){return function(t){this[e]=+t}},c=[/[+-]\d\d:?(\d\d)?|Z/,function(e){(this.zone||(this.zone={})).offset=function(e){if(!e||"Z"===e)return 0;var t=e.match(/([+-]|\d\d)/g),r=60*t[1]+(+t[2]||0);return 0===r?0:"+"===t[0]?-r:r}(e)}],u=function(e){var t=i[e];return t&&(t.indexOf?t:t.s.concat(t.f))},d=function(e,t){var r,n=i.meridiem;if(n){for(var o=1;o<=24;o+=1)if(e.indexOf(n(o,0,t))>-1){r=o>12;break}}else r=e===(t?"pm":"PM");return r},p={A:[a,function(e){this.afternoon=d(e,!1)}],a:[a,function(e){this.afternoon=d(e,!0)}],Q:[r,function(e){this.month=3*(e-1)+1}],S:[r,function(e){this.milliseconds=100*e}],SS:[n,function(e){this.milliseconds=10*e}],SSS:[/\d{3}/,function(e){this.milliseconds=+e}],s:[o,s("seconds")],ss:[o,s("seconds")],m:[o,s("minutes")],mm:[o,s("minutes")],H:[o,s("hours")],h:[o,s("hours")],HH:[o,s("hours")],hh:[o,s("hours")],D:[o,s("day")],DD:[n,s("day")],Do:[a,function(e){var t=i.ordinal,r=e.match(/\d+/);if(this.day=r[0],t)for(var n=1;n<=31;n+=1)t(n).replace(/\[|\]/g,"")===e&&(this.day=n)}],w:[o,s("week")],ww:[n,s("week")],M:[o,s("month")],MM:[n,s("month")],MMM:[a,function(e){var t=u("months"),r=(u("monthsShort")||t.map(function(e){return e.slice(0,3)})).indexOf(e)+1;if(r<1)throw Error();this.month=r%12||r}],MMMM:[a,function(e){var t=u("months").indexOf(e)+1;if(t<1)throw Error();this.month=t%12||t}],Y:[/[+-]?\d+/,s("year")],YY:[n,function(e){this.year=l(e)}],YYYY:[/\d{4}/,s("year")],Z:c,ZZ:c};return function(r,n,o){o.p.customParseFormat=!0,r&&r.parseTwoDigitYear&&(l=r.parseTwoDigitYear);var a=n.prototype,s=a.parse;a.parse=function(r){var n=r.date,a=r.utc,l=r.args;this.$u=a;var c=l[1];if("string"==typeof c){var u=!0===l[2],d=!0===l[3],f=l[2];d&&(f=l[2]),i=this.$locale(),!u&&f&&(i=o.Ls[f]),this.$d=function(r,n,o,a){try{if(["x","X"].indexOf(n)>-1)return new Date(("X"===n?1e3:1)*r);var l=(function(r){var n,o;n=r,o=i&&i.formats;for(var a=(r=n.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g,function(t,r,n){var a=n&&n.toUpperCase();return r||o[n]||e[n]||o[a].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g,function(e,t,r){return t||r.slice(1)})})).match(t),l=a.length,s=0;s<l;s+=1){var c=a[s],u=p[c],d=u&&u[0],f=u&&u[1];a[s]=f?{regex:d,parser:f}:c.replace(/^\[|\]$/g,"")}return function(e){for(var t={},r=0,n=0;r<l;r+=1){var o=a[r];if("string"==typeof o)n+=o.length;else{var i=o.regex,s=o.parser,c=e.slice(n),u=i.exec(c)[0];s.call(t,u),e=e.replace(u,"")}}return function(e){var t=e.afternoon;if(void 0!==t){var r=e.hours;t?r<12&&(e.hours+=12):12===r&&(e.hours=0),delete e.afternoon}}(t),t}})(n)(r),s=l.year,c=l.month,u=l.day,d=l.hours,f=l.minutes,m=l.seconds,h=l.milliseconds,g=l.zone,y=l.week,b=new Date,x=u||(s||c?1:b.getDate()),v=s||b.getFullYear(),w=0;s&&!c||(w=c>0?c-1:b.getMonth());var S,k=d||0,j=f||0,$=m||0,C=h||0;return g?new Date(Date.UTC(v,w,x,k,j,$,C+60*g.offset*1e3)):o?new Date(Date.UTC(v,w,x,k,j,$,C)):(S=new Date(v,w,x,k,j,$,C),y&&(S=a(S).week(y).toDate()),S)}catch(e){return new Date("")}}(n,c,a,o),this.init(),f&&!0!==f&&(this.$L=this.locale(f).$L),(u||d)&&n!=this.format(c)&&(this.$d=new Date("")),i={}}else if(c instanceof Array)for(var m=c.length,h=1;h<=m;h+=1){l[1]=c[h-1];var g=o.apply(this,l);if(g.isValid()){this.$d=g.$d,this.$L=g.$L,this.init();break}h===m&&(this.$d=new Date(""))}else s.call(this,r)}}}()},38900,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useIntersection",{enumerable:!0,get:function(){return s}});let n=e.r(975705),o=e.r(756398),a="function"==typeof IntersectionObserver,i=new Map,l=[];function s({rootRef:e,rootMargin:t,disabled:r}){let c=r||!a,[u,d]=(0,n.useState)(!1),p=(0,n.useRef)(null),f=(0,n.useCallback)(e=>{p.current=e},[]);return(0,n.useEffect)(()=>{if(a){if(c||u)return;let r=p.current;if(r&&r.tagName)return function(e,t,r){let{id:n,observer:o,elements:a}=function(e){let t,r={root:e.root||null,margin:e.rootMargin||""},n=l.find(e=>e.root===r.root&&e.margin===r.margin);if(n&&(t=i.get(n)))return t;let o=new Map;return t={id:r,observer:new IntersectionObserver(e=>{e.forEach(e=>{let t=o.get(e.target),r=e.isIntersecting||e.intersectionRatio>0;t&&r&&t(r)})},e),elements:o},l.push(r),i.set(r,t),t}(r);return a.set(e,t),o.observe(e),function(){if(a.delete(e),o.unobserve(e),0===a.size){o.disconnect(),i.delete(n);let e=l.findIndex(e=>e.root===n.root&&e.margin===n.margin);e>-1&&l.splice(e,1)}}}(r,e=>e&&d(e),{root:e?.current,rootMargin:t})}else if(!u){let e=(0,o.requestIdleCallback)(()=>d(!0));return()=>(0,o.cancelIdleCallback)(e)}},[c,t,e,u,p.current]),[f,u,(0,n.useCallback)(()=>{d(!1)},[])]}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},447326,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"normalizeLocalePath",{enumerable:!0,get:function(){return n}});let n=(t,r)=>e.r(855119).normalizeLocalePath(t,r);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},804785,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"getDomainLocale",{enumerable:!0,get:function(){return o}});let n=e.r(85095);function o(t,r,o,a){{let i=e.r(447326).normalizeLocalePath,l=e.r(224520).detectDomainLocale,s=r||i(t,o).detectedLocale,c=l(a,void 0,s);if(c){let e=`http${c.http?"":"s"}://`,r=s===c.defaultLocale?"":`/${s}`;return`${e}${c.domain}${(0,n.normalizePathTrailingSlash)(`${r}${t}`)}`}return!1}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},136997,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return o}});let n=e.r(975705);function o(e,t){let r=(0,n.useRef)(null),o=(0,n.useRef)(null);return(0,n.useCallback)(n=>{if(null===n){let e=r.current;e&&(r.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(r.current=a(e,n)),t&&(o.current=a(t,n))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},246448,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return n}});let n=e=>{}},457065,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var n={default:function(){return j},useLinkStatus:function(){return k}};for(var o in n)Object.defineProperty(r,o,{enumerable:!0,get:n[o]});let a=e.r(887602),i=e.r(268601),l=a._(e.r(975705)),s=e.r(56868),c=e.r(99550),u=e.r(886763),d=e.r(954561),p=e.r(306564),f=e.r(465028),m=e.r(38900),h=e.r(804785),g=e.r(348830),y=e.r(136997);e.r(246448);let b=new Set;function x(e,t,r,n){if(!("u"<typeof window)&&(0,c.isLocalURL)(t)){if(!n.bypassPrefetchedCheck){let o=t+"%"+r+"%"+(void 0!==n.locale?n.locale:"locale"in e?e.locale:void 0);if(b.has(o))return;b.add(o)}e.prefetch(t,r,n).catch(e=>{})}}function v(e){return"string"==typeof e?e:(0,u.formatUrl)(e)}let w=l.default.forwardRef(function(e,t){let r,n,{href:o,as:a,children:u,prefetch:b=null,passHref:w,replace:S,shallow:k,scroll:j,locale:$,onClick:C,onNavigate:T,onMouseEnter:M,onTouchStart:N,legacyBehavior:E=!1,transitionTypes:I,...D}=e;r=u,E&&("string"==typeof r||"number"==typeof r)&&(r=(0,i.jsx)("a",{children:r}));let P=l.default.useContext(f.RouterContext),O=!1!==b,{href:z,as:A}=l.default.useMemo(()=>{if(!P){let e=v(o);return{href:e,as:a?v(a):e}}let[e,t]=(0,s.resolveHref)(P,o,!0);return{href:e,as:a?(0,s.resolveHref)(P,a):t||e}},[P,o,a]),R=l.default.useRef(z),L=l.default.useRef(A);E&&(n=l.default.Children.only(r));let F=E?n&&"object"==typeof n&&n.ref:t,[B,H,W]=(0,m.useIntersection)({rootMargin:"200px"}),U=l.default.useCallback(e=>{(L.current!==A||R.current!==z)&&(W(),L.current=A,R.current=z),B(e)},[A,z,W,B]),Y=(0,y.useMergedRef)(U,F);l.default.useEffect(()=>{!P||H&&O&&x(P,z,A,{locale:$})},[A,z,H,$,O,P?.locale,P]);let _={ref:Y,onClick(e){E||"function"!=typeof C||C(e),E&&n.props&&"function"==typeof n.props.onClick&&n.props.onClick(e),!P||e.defaultPrevented||function(e,t,r,n,o,a,i,l,s){let u,{nodeName:d}=e.currentTarget;if(!("A"===d.toUpperCase()&&((u=e.currentTarget.getAttribute("target"))&&"_self"!==u||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.nativeEvent&&2===e.nativeEvent.which)||e.currentTarget.hasAttribute("download"))){if(!(0,c.isLocalURL)(r)){o&&(e.preventDefault(),location.replace(r));return}e.preventDefault(),(()=>{if(s){let e=!1;if(s({preventDefault:()=>{e=!0}}),e)return}let e=i??!0;"beforePopState"in t?t[o?"replace":"push"](r,n,{shallow:a,locale:l,scroll:e}):t[o?"replace":"push"](n||r,{scroll:e})})()}}(e,P,z,A,S,k,j,$,T)},onMouseEnter(e){E||"function"!=typeof M||M(e),E&&n.props&&"function"==typeof n.props.onMouseEnter&&n.props.onMouseEnter(e),P&&x(P,z,A,{locale:$,priority:!0,bypassPrefetchedCheck:!0})},onTouchStart:function(e){E||"function"!=typeof N||N(e),E&&n.props&&"function"==typeof n.props.onTouchStart&&n.props.onTouchStart(e),P&&x(P,z,A,{locale:$,priority:!0,bypassPrefetchedCheck:!0})}};if((0,d.isAbsoluteUrl)(A))_.href=A;else if(!E||w||"a"===n.type&&!("href"in n.props)){let e=void 0!==$?$:P?.locale;_.href=P?.isLocaleDomain&&(0,h.getDomainLocale)(A,e,P?.locales,P?.domainLocales)||(0,g.addBasePath)((0,p.addLocale)(A,e,P?.defaultLocale))}return E?l.default.cloneElement(n,_):(0,i.jsx)("a",{...D,..._,children:r})}),S=(0,l.createContext)({pending:!1}),k=()=>(0,l.useContext)(S),j=w;("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},166857,(e,t,r)=>{t.exports=e.r(457065)},627812,412654,601681,343805,421097,124605,e=>{"use strict";var t=e.i(268601),r=e.i(975705);e.i(16717);var n=e.i(726985),o=e.i(538405),a=e.i(371836),i=e.i(201091),l=e.i(225661);let s=(0,l.default)("shrink",[["path",{d:"m15 15 6 6m-6-6v4.8m0-4.8h4.8",key:"17vawe"}],["path",{d:"M9 19.8V15m0 0H4.2M9 15l-6 6",key:"chjx8e"}],["path",{d:"M15 4.2V9m0 0h4.8M15 9l6-6",key:"lav6yq"}],["path",{d:"M9 4.2V9m0 0H4.2M9 9 3 3",key:"1pxi2q"}]]),c=(0,l.default)("link",[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"1cjeqo"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"19qd67"}]]);var u=e.i(382704);let d=(0,l.default)("list",[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]]),p=(0,l.default)("bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]),f=(0,l.default)("file-code-corner",[["path",{d:"M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35",key:"1wthlu"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"m5 16-3 3 3 3",key:"331omg"}],["path",{d:"m9 22 3-3-3-3",key:"lsp7cz"}]]);var m=e.i(261604),h=e.i(255404),g=e.i(815905),y=e.i(230959);e.i(942865);var b=e.i(748354),x=e.i(480736),v=e.i(505655),w=e.i(599316),S=e.i(775068),k=e.i(251157),j=e.i(219615),$=e.i(958189),C=e.i(992582),T=e.i(697299),M=e.i(180486),N=e.i(167776),E=e.i(519777),I=e.i(287175),D=e.i(242346),P=e.i(328488);e.i(868719);var O=e.i(715723),z=e.i(13456),A=e.i(912562),R=e.i(454816),L=e.i(842603),F=e.i(12868),B=e.i(640595),H=e.i(591986),W=e.i(811368),U=e.i(697151),Y=e.i(116086),_=e.i(264178);let V=(0,o.createStyles)(({token:e,css:t})=>({flyoutContainer:t`
        position: relative;
        display: inline-flex;
    `,flyoutMenu:t`
        position: fixed;
        min-width: 220px;
        max-height: 70vh;
        background: ${e.colorBgElevated};
        border: 1px solid ${e.colorBorderSecondary};
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        z-index: 9999;
        animation: fadeIn 0.15s ease-out;
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateX(-8px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `,flyoutScroll:t`
        max-height: 70vh;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 4px 0;
        
        &::-webkit-scrollbar {
            width: 4px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        &::-webkit-scrollbar-thumb {
            background: ${e.colorTextQuaternary};
            border-radius: 2px;
        }
    `,sectionTitle:t`
        font-size: 11px;
        font-weight: 600;
        color: ${e.colorTextSecondary};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 8px 12px 4px;
        margin-top: 4px;
        
        &:first-child {
            margin-top: 0;
        }
    `,menuItem:t`
        display: flex;
        align-items: center;
        padding: 6px 12px;
        cursor: pointer;
        transition: background 0.15s;
        gap: 8px;
        
        &:hover {
            background: ${e.colorFillTertiary};
        }
        
        &.active {
            background: ${e.colorPrimary}15;
        }
    `,menuItemIcon:t`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        color: ${e.colorTextSecondary};
        flex-shrink: 0;
    `,menuItemLabel:t`
        flex: 1;
        font-size: 13px;
        color: ${e.colorText};
        white-space: nowrap;
    `,menuItemShortcut:t`
        margin-left: auto;
        flex-shrink: 0;
    `,favoriteBtn:t`
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        opacity: 0;
        transition: opacity 0.15s, color 0.15s;
        color: ${e.colorTextQuaternary};
        cursor: pointer;
        border-radius: 4px;
        flex-shrink: 0;
        background: transparent;
        border: none;
        padding: 0;
        
        &:hover {
            color: ${e.colorWarning};
            background: ${e.colorWarning}15;
        }
        
        &.visible {
            opacity: 1;
        }
        
        &.active {
            opacity: 1;
            color: ${e.colorWarning};
        }
    `,separator:t`
        height: 1px;
        background: ${e.colorTextQuaternary};
        margin: 8px 0;
    `})),q=(0,r.memo)(({item:e,isActive:o,isFavorite:a,onSelect:i,onToggleFavorite:l,showFavorites:s,styles:c,cx:u})=>{let{t:d}=(0,n.useTranslation)("workspace"),[p,f]=(0,r.useState)(!1);return(0,t.jsxs)("div",{className:u(c.menuItem,o&&"active"),onClick:()=>i(e.id),onMouseEnter:()=>f(!0),onMouseLeave:()=>f(!1),children:[(0,t.jsx)("span",{className:c.menuItemIcon,children:e.icon}),(0,t.jsx)("span",{className:c.menuItemLabel,children:e.name}),e.shortcut&&(0,t.jsx)("span",{className:c.menuItemShortcut,children:(0,t.jsx)(U.Hotkey,{keys:e.shortcut.toLowerCase().replace(/ \+ /g,"+")})}),s&&(0,t.jsx)("button",{className:u(c.favoriteBtn,(p||a)&&"visible",a&&"active"),onClick:t=>{t.stopPropagation(),l(e.id)},title:d(a?"drawingTools.removeFromFavorites":"drawingTools.addToFavorites"),children:a?(0,t.jsx)(Y.FavoriteFilledIcon,{size:16}):(0,t.jsx)(Y.FavoriteOutlineIcon,{size:16})})]})});q.displayName="MenuItem";let K=(0,r.memo)(({isOpen:e,onOpenChange:o,onSelectTool:a,activeToolId:i,triggerElement:l,toolGroups:s,showFavorites:c=!1,rootClassName:u})=>{let{styles:d,cx:p}=V(),{t:f}=(0,n.useTranslation)("workspace"),m=(0,_.useDrawingFavoritesStore)(e=>e.favoriteLineToolIds),h=(0,_.useDrawingFavoritesStore)(e=>e.toggleFavoriteLineTool),g=(0,r.useMemo)(()=>new Set(m),[m]),y=(0,r.useRef)(null),x=(0,r.useRef)(null),v=(0,r.useMemo)(()=>[{title:f("drawingTools.groups.lines"),items:[{id:"TrendLine",name:f("drawingTools.items.TrendLine"),icon:(0,t.jsx)(O.TrendLineIcon,{size:20}),shortcut:"Alt + T"},{id:"Ray",name:f("drawingTools.items.Ray"),icon:(0,t.jsx)(z.RayIcon,{size:20})},{id:"ExtendedLine",name:f("drawingTools.items.ExtendedLine"),icon:(0,t.jsx)(A.ExtendedLineIcon,{size:20})},{id:"HorizontalLine",name:f("drawingTools.items.HorizontalLine"),icon:(0,t.jsx)(R.HorizontalLineIcon,{size:20}),shortcut:"Alt + H"},{id:"HorizontalRay",name:f("drawingTools.items.HorizontalRay"),icon:(0,t.jsx)(L.HorizontalRayIcon,{size:20}),shortcut:"Alt + J"},{id:"VerticalLine",name:f("drawingTools.items.VerticalLine"),icon:(0,t.jsx)(F.VerticalLineIcon,{size:20}),shortcut:"Alt + V"},{id:"CrossLine",name:f("drawingTools.items.CrossLine"),icon:(0,t.jsx)(B.CrossLineIcon,{size:20}),shortcut:"Alt + C"}]},{title:f("drawingTools.groups.advanced"),items:[{id:"FibRetracement",name:f("drawingTools.items.FibRetracement"),icon:(0,t.jsx)(b.FibonacciIcon,{size:20})},{id:"ParallelChannel",name:f("drawingTools.items.ParallelChannel"),icon:(0,t.jsx)(H.ParallelChannelIcon,{size:20})}]}],[f]),[w,S]=(0,r.useState)({top:0,left:0});(0,r.useEffect)(()=>{if(e&&y.current){let e=y.current.getBoundingClientRect();S({top:e.top,left:e.right+4})}},[e]),(0,r.useEffect)(()=>{if(!e)return;let t=e=>{let t=e.target,r=y.current?.contains(t),n=x.current?.contains(t);r||n||o(!1)};return document.addEventListener("mousedown",t,!0),()=>document.removeEventListener("mousedown",t,!0)},[e,o]),(0,r.useEffect)(()=>{if(!e)return;let t=e=>{"Escape"===e.key&&o(!1)};return document.addEventListener("keydown",t),()=>document.removeEventListener("keydown",t)},[e,o]);let k=(0,r.useCallback)(e=>{a(e),o(!1)},[a,o]),j=(0,r.useCallback)(e=>{c&&h(e)},[c,h]);return(0,t.jsxs)("div",{className:p(d.flyoutContainer,u),ref:y,children:[(0,t.jsx)("div",{onClick:()=>o(!e),children:l}),e&&"u">typeof document&&(0,W.createPortal)((0,t.jsx)("div",{className:d.flyoutMenu,ref:x,style:{top:w.top,left:w.left},children:(0,t.jsx)("div",{className:d.flyoutScroll,children:(s??v).map((e,n)=>(0,t.jsxs)(r.default.Fragment,{children:[n>0&&(0,t.jsx)("div",{className:d.separator}),(0,t.jsx)("div",{className:d.sectionTitle,children:e.title}),e.items.map(e=>(0,t.jsx)(q,{item:e,isActive:i===e.id,isFavorite:g.has(e.id),onSelect:k,onToggleFavorite:j,showFavorites:c,styles:d,cx:p},e.id))]},e.title))})}),document.body)]})});K.displayName="DrawingToolsFlyout";var X=e.i(970119),G=e.i(123656);let Q=(0,r.createContext)(null),Z=(0,r.createContext)(null),J=(0,r.createContext)(null),ee=(0,r.createContext)(null),et=(0,r.createContext)(null),er=(0,r.createContext)(null),en=(0,r.createContext)(null),eo=(0,r.createContext)(null),ea=(0,r.createContext)(null),ei="workspace-ui-state-v1",el=new Set(["watchlist","alarms","objectTree","messages"]),es=r.default.useLayoutEffect,ec={isTaskViewActive:!1,isDrawingPanelActive:!0,activeRightPanel:"watchlist",isCalendarOpen:!1,isScriptEditorOpen:!1,isBotChatOpen:!0,isSymbolInfoOpen:!1,isMarketPulseOpen:!1};function eu({children:e}){let[n,o]=(0,r.useState)(ec.isTaskViewActive),[a,i]=(0,r.useState)(ec.isDrawingPanelActive),[l,s]=(0,r.useState)(ec.activeRightPanel),[c,u]=(0,r.useState)(ec.isCalendarOpen),[d,p]=(0,r.useState)(ec.isScriptEditorOpen),[f,m]=(0,r.useState)(ec.isBotChatOpen),[h,g]=(0,r.useState)(ec.isSymbolInfoOpen),[y,b]=(0,r.useState)(ec.isMarketPulseOpen),[x,v]=(0,r.useState)(!1),[w,S]=(0,r.useState)(!1);es(()=>{let e=(()=>{try{let e=G.coalescedLocalStorage.getItem(ei);if(!e)return ec;let t=JSON.parse(e),r=!0===t.isSymbolInfoOpen,n=!r&&(t.isBotChatOpen??ec.isBotChatOpen),o=t.activeRightPanel,a=null===o?null:"string"==typeof o&&el.has(o)?o:ec.activeRightPanel;return(n||r)&&null===a&&(a="watchlist"),{...ec,...t,activeRightPanel:a,isBotChatOpen:n,isSymbolInfoOpen:r}}catch{return ec}})();o(e.isTaskViewActive),i(e.isDrawingPanelActive),s(e.activeRightPanel),u(e.isCalendarOpen),p(e.isScriptEditorOpen),m(e.isBotChatOpen),g(e.isSymbolInfoOpen),b(e.isMarketPulseOpen),S(!0)},[]),r.default.useEffect(()=>{w&&G.coalescedLocalStorage.setItem(ei,JSON.stringify({isTaskViewActive:n,isDrawingPanelActive:a,activeRightPanel:l,isCalendarOpen:c,isScriptEditorOpen:d,isBotChatOpen:f,isSymbolInfoOpen:h,isMarketPulseOpen:y}))},[w,n,a,l,c,d,f,h,y]);let k=(0,r.useCallback)(e=>{m(e),e&&g(!1)},[]),j=(0,r.useCallback)(e=>{g(e),e&&m(!1)},[]),$=(0,r.useCallback)(e=>{let t=l!==e;s(t?e:null),t||(m(!1),g(!1)),t&&p(!1)},[l]),C=(0,r.useMemo)(()=>({isTaskViewActive:n,setTaskViewActive:o}),[n]),T=(0,r.useMemo)(()=>({isDrawingPanelActive:a,setDrawingPanelActive:i}),[a]),M=(0,r.useMemo)(()=>({isCalendarOpen:c,setCalendarOpen:u}),[c]),N=(0,r.useMemo)(()=>({isScriptEditorOpen:d,setScriptEditorOpen:p}),[d]),E=(0,r.useMemo)(()=>({isMarketPulseOpen:y,setMarketPulseOpen:b}),[y]),I=(0,r.useMemo)(()=>({activeRightPanel:l,toggleRightPanel:$}),[l,$]),D=(0,r.useMemo)(()=>({isBotChatOpen:f,setBotChatOpen:k}),[f,k]),P=(0,r.useMemo)(()=>({isSymbolInfoOpen:h,setSymbolInfoOpen:j}),[h,j]),O=(0,r.useMemo)(()=>({isInteracting:x,setInteracting:v}),[x]);return(0,t.jsx)(Q.Provider,{value:C,children:(0,t.jsx)(Z.Provider,{value:T,children:(0,t.jsx)(J.Provider,{value:M,children:(0,t.jsx)(ee.Provider,{value:N,children:(0,t.jsx)(et.Provider,{value:E,children:(0,t.jsx)(er.Provider,{value:I,children:(0,t.jsx)(en.Provider,{value:D,children:(0,t.jsx)(eo.Provider,{value:P,children:(0,t.jsx)(ea.Provider,{value:O,children:e})})})})})})})})})}function ed(){let e=(0,r.useContext)(Z);if(!e)throw Error("useWorkspaceDrawingPanelContext must be used within WorkspaceProvider");return{isDrawingPanelActive:e.isDrawingPanelActive,setDrawingPanelActive:e.setDrawingPanelActive}}function ep(){let e=(0,r.useContext)(J);if(!e)throw Error("useWorkspaceCalendarContext must be used within WorkspaceProvider");return{isCalendarOpen:e.isCalendarOpen,setCalendarOpen:e.setCalendarOpen}}function ef(){let e=(0,r.useContext)(ee);if(!e)throw Error("useWorkspaceScriptEditorContext must be used within WorkspaceProvider");return{isScriptEditorOpen:e.isScriptEditorOpen,setScriptEditorOpen:e.setScriptEditorOpen}}function em(){let e=(0,r.useContext)(er);if(!e)throw Error("useWorkspaceRightPanelContext must be used within WorkspaceProvider");return{activeRightPanel:e.activeRightPanel,toggleRightPanel:e.toggleRightPanel}}function eh(){let e=(0,r.useContext)(en);if(!e)throw Error("useWorkspaceBotChatContext must be used within WorkspaceProvider");return{isBotChatOpen:e.isBotChatOpen,setBotChatOpen:e.setBotChatOpen}}function eg(){let e=(0,r.useContext)(eo);if(!e)throw Error("useWorkspaceSymbolInfoContext must be used within WorkspaceProvider");return{isSymbolInfoOpen:e.isSymbolInfoOpen,setSymbolInfoOpen:e.setSymbolInfoOpen}}var ey=e.i(656600),eb=e.i(326501);let ex=(0,l.default)("grip-horizontal",[["circle",{cx:"12",cy:"9",r:"1",key:"124mty"}],["circle",{cx:"19",cy:"9",r:"1",key:"1ruzo2"}],["circle",{cx:"5",cy:"9",r:"1",key:"1a8b28"}],["circle",{cx:"12",cy:"15",r:"1",key:"1e56xg"}],["circle",{cx:"19",cy:"15",r:"1",key:"1a92ep"}],["circle",{cx:"5",cy:"15",r:"1",key:"5r1jwy"}]]);var ev=e.i(404514),ew=e.i(217321),eS=e.i(5670),ek=e.i(913514),ej=e.i(418306),e$=e.i(974790),eC=e.i(809393);let eT=(0,l.default)("list-end",[["path",{d:"M16 5H3",key:"m91uny"}],["path",{d:"M16 12H3",key:"1a2rj7"}],["path",{d:"M9 19H3",key:"s61nz1"}],["path",{d:"m16 16-3 3 3 3",key:"117b85"}],["path",{d:"M21 5v12a2 2 0 0 1-2 2h-6",key:"hey24a"}]]);var eM=e.i(549989),eN=e.i(706775);function eE(e,t,r){let n,o=r.initialDeps??[],a=!0;function i(){var i,l,s;let c,u;r.key&&(null==(i=r.debug)?void 0:i.call(r))&&(c=Date.now());let d=e();if(!(d.length!==o.length||d.some((e,t)=>o[t]!==e)))return n;if(o=d,r.key&&(null==(l=r.debug)?void 0:l.call(r))&&(u=Date.now()),n=t(...d),r.key&&(null==(s=r.debug)?void 0:s.call(r))){let e=Math.round((Date.now()-c)*100)/100,t=Math.round((Date.now()-u)*100)/100,n=t/16,o=(e,t)=>{for(e=String(e);e.length<t;)e=" "+e;return e};console.info(`%c⏱ ${o(t,5)} /${o(e,5)} ms`,`
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0,Math.min(120-120*n,120))}deg 100% 31%);`,null==r?void 0:r.key)}return(null==r?void 0:r.onChange)&&!(a&&r.skipInitialOnChange)&&r.onChange(n),a=!1,n}return i.updateDeps=e=>{o=e},i}function eI(e,t){if(void 0!==e)return e;throw Error(`Unexpected undefined${t?`: ${t}`:""}`)}let eD=e=>{let{offsetWidth:t,offsetHeight:r}=e;return{width:t,height:r}},eP=e=>e,eO=e=>{let t=Math.max(e.startIndex-e.overscan,0),r=Math.min(e.endIndex+e.overscan,e.count-1),n=[];for(let e=t;e<=r;e++)n.push(e);return n},ez=(e,t)=>{let r=e.scrollElement;if(!r)return;let n=e.targetWindow;if(!n)return;let o=e=>{let{width:r,height:n}=e;t({width:Math.round(r),height:Math.round(n)})};if(o(eD(r)),!n.ResizeObserver)return()=>{};let a=new n.ResizeObserver(t=>{let n=()=>{let e=t[0];if(null==e?void 0:e.borderBoxSize){let t=e.borderBoxSize[0];if(t)return void o({width:t.inlineSize,height:t.blockSize})}o(eD(r))};e.options.useAnimationFrameWithResizeObserver?requestAnimationFrame(n):n()});return a.observe(r,{box:"border-box"}),()=>{a.unobserve(r)}},eA={passive:!0},eR="u"<typeof window||"onscrollend"in window,eL=(e,t)=>{var r,n;let o,a=e.scrollElement;if(!a)return;let i=e.targetWindow;if(!i)return;let l=0,s=e.options.useScrollendEvent&&eR?()=>void 0:(r=()=>{t(l,!1)},n=e.options.isScrollingResetDelay,function(...e){i.clearTimeout(o),o=i.setTimeout(()=>r.apply(this,e),n)}),c=r=>()=>{let{horizontal:n,isRtl:o}=e.options;l=n?a.scrollLeft*(o&&-1||1):a.scrollTop,s(),t(l,r)},u=c(!0),d=c(!1);a.addEventListener("scroll",u,eA);let p=e.options.useScrollendEvent&&eR;return p&&a.addEventListener("scrollend",d,eA),()=>{a.removeEventListener("scroll",u),p&&a.removeEventListener("scrollend",d)}},eF=(e,t,r)=>{if(null==t?void 0:t.borderBoxSize){let e=t.borderBoxSize[0];if(e)return Math.round(e[r.options.horizontal?"inlineSize":"blockSize"])}return e[r.options.horizontal?"offsetWidth":"offsetHeight"]},eB=(e,{adjustments:t=0,behavior:r},n)=>{var o,a;null==(a=null==(o=n.scrollElement)?void 0:o.scrollTo)||a.call(o,{[n.options.horizontal?"left":"top"]:e+t,behavior:r})};class eH{constructor(e){this.unsubs=[],this.scrollElement=null,this.targetWindow=null,this.isScrolling=!1,this.scrollState=null,this.measurementsCache=[],this.itemSizeCache=new Map,this.laneAssignments=new Map,this.pendingMeasuredCacheIndexes=[],this.prevLanes=void 0,this.lanesChangedFlag=!1,this.lanesSettling=!1,this.scrollRect=null,this.scrollOffset=null,this.scrollDirection=null,this.scrollAdjustments=0,this.elementsCache=new Map,this.now=()=>{var e,t,r;return(null==(r=null==(t=null==(e=this.targetWindow)?void 0:e.performance)?void 0:t.now)?void 0:r.call(t))??Date.now()},this.observer=(()=>{let e=null,t=()=>e||(this.targetWindow&&this.targetWindow.ResizeObserver?e=new this.targetWindow.ResizeObserver(e=>{e.forEach(e=>{let t=()=>{let t=e.target,r=this.indexFromElement(t);t.isConnected?this.shouldMeasureDuringScroll(r)&&this.resizeItem(r,this.options.measureElement(t,e,this)):this.observer.unobserve(t)};this.options.useAnimationFrameWithResizeObserver?requestAnimationFrame(t):t()})}):null);return{disconnect:()=>{var r;null==(r=t())||r.disconnect(),e=null},observe:e=>{var r;return null==(r=t())?void 0:r.observe(e,{box:"border-box"})},unobserve:e=>{var r;return null==(r=t())?void 0:r.unobserve(e)}}})(),this.range=null,this.setOptions=e=>{Object.entries(e).forEach(([t,r])=>{void 0===r&&delete e[t]}),this.options={debug:!1,initialOffset:0,overscan:1,paddingStart:0,paddingEnd:0,scrollPaddingStart:0,scrollPaddingEnd:0,horizontal:!1,getItemKey:eP,rangeExtractor:eO,onChange:()=>{},measureElement:eF,initialRect:{width:0,height:0},scrollMargin:0,gap:0,indexAttribute:"data-index",initialMeasurementsCache:[],lanes:1,isScrollingResetDelay:150,enabled:!0,isRtl:!1,useScrollendEvent:!1,useAnimationFrameWithResizeObserver:!1,...e}},this.notify=e=>{var t,r;null==(r=(t=this.options).onChange)||r.call(t,this,e)},this.maybeNotify=eE(()=>(this.calculateRange(),[this.isScrolling,this.range?this.range.startIndex:null,this.range?this.range.endIndex:null]),e=>{this.notify(e)},{key:!1,debug:()=>this.options.debug,initialDeps:[this.isScrolling,this.range?this.range.startIndex:null,this.range?this.range.endIndex:null]}),this.cleanup=()=>{this.unsubs.filter(Boolean).forEach(e=>e()),this.unsubs=[],this.observer.disconnect(),null!=this.rafId&&this.targetWindow&&(this.targetWindow.cancelAnimationFrame(this.rafId),this.rafId=null),this.scrollState=null,this.scrollElement=null,this.targetWindow=null},this._didMount=()=>()=>{this.cleanup()},this._willUpdate=()=>{var e;let t=this.options.enabled?this.options.getScrollElement():null;if(this.scrollElement!==t){if(this.cleanup(),!t)return void this.maybeNotify();this.scrollElement=t,this.scrollElement&&"ownerDocument"in this.scrollElement?this.targetWindow=this.scrollElement.ownerDocument.defaultView:this.targetWindow=(null==(e=this.scrollElement)?void 0:e.window)??null,this.elementsCache.forEach(e=>{this.observer.observe(e)}),this.unsubs.push(this.options.observeElementRect(this,e=>{this.scrollRect=e,this.maybeNotify()})),this.unsubs.push(this.options.observeElementOffset(this,(e,t)=>{this.scrollAdjustments=0,this.scrollDirection=t?this.getScrollOffset()<e?"forward":"backward":null,this.scrollOffset=e,this.isScrolling=t,this.scrollState&&this.scheduleScrollReconcile(),this.maybeNotify()})),this._scrollToOffset(this.getScrollOffset(),{adjustments:void 0,behavior:void 0})}},this.rafId=null,this.getSize=()=>this.options.enabled?(this.scrollRect=this.scrollRect??this.options.initialRect,this.scrollRect[this.options.horizontal?"width":"height"]):(this.scrollRect=null,0),this.getScrollOffset=()=>this.options.enabled?(this.scrollOffset=this.scrollOffset??("function"==typeof this.options.initialOffset?this.options.initialOffset():this.options.initialOffset),this.scrollOffset):(this.scrollOffset=null,0),this.getFurthestMeasurement=(e,t)=>{let r=new Map,n=new Map;for(let o=t-1;o>=0;o--){let t=e[o];if(r.has(t.lane))continue;let a=n.get(t.lane);if(null==a||t.end>a.end?n.set(t.lane,t):t.end<a.end&&r.set(t.lane,!0),r.size===this.options.lanes)break}return n.size===this.options.lanes?Array.from(n.values()).sort((e,t)=>e.end===t.end?e.index-t.index:e.end-t.end)[0]:void 0},this.getMeasurementOptions=eE(()=>[this.options.count,this.options.paddingStart,this.options.scrollMargin,this.options.getItemKey,this.options.enabled,this.options.lanes],(e,t,r,n,o,a)=>(void 0!==this.prevLanes&&this.prevLanes!==a&&(this.lanesChangedFlag=!0),this.prevLanes=a,this.pendingMeasuredCacheIndexes=[],{count:e,paddingStart:t,scrollMargin:r,getItemKey:n,enabled:o,lanes:a}),{key:!1}),this.getMeasurements=eE(()=>[this.getMeasurementOptions(),this.itemSizeCache],({count:e,paddingStart:t,scrollMargin:r,getItemKey:n,enabled:o,lanes:a},i)=>{if(!o)return this.measurementsCache=[],this.itemSizeCache.clear(),this.laneAssignments.clear(),[];if(this.laneAssignments.size>e)for(let t of this.laneAssignments.keys())t>=e&&this.laneAssignments.delete(t);this.lanesChangedFlag&&(this.lanesChangedFlag=!1,this.lanesSettling=!0,this.measurementsCache=[],this.itemSizeCache.clear(),this.laneAssignments.clear(),this.pendingMeasuredCacheIndexes=[]),0!==this.measurementsCache.length||this.lanesSettling||(this.measurementsCache=this.options.initialMeasurementsCache,this.measurementsCache.forEach(e=>{this.itemSizeCache.set(e.key,e.size)}));let l=this.lanesSettling?0:this.pendingMeasuredCacheIndexes.length>0?Math.min(...this.pendingMeasuredCacheIndexes):0;this.pendingMeasuredCacheIndexes=[],this.lanesSettling&&this.measurementsCache.length===e&&(this.lanesSettling=!1);let s=this.measurementsCache.slice(0,l),c=Array(a).fill(void 0);for(let e=0;e<l;e++){let t=s[e];t&&(c[t.lane]=e)}for(let o=l;o<e;o++){let e,a,l=n(o),u=this.laneAssignments.get(o);if(void 0!==u&&this.options.lanes>1){let n=c[e=u],o=void 0!==n?s[n]:void 0;a=o?o.end+this.options.gap:t+r}else{let n=1===this.options.lanes?s[o-1]:this.getFurthestMeasurement(s,o);a=n?n.end+this.options.gap:t+r,e=n?n.lane:o%this.options.lanes,this.options.lanes>1&&this.laneAssignments.set(o,e)}let d=i.get(l),p="number"==typeof d?d:this.options.estimateSize(o),f=a+p;s[o]={index:o,start:a,size:p,end:f,key:l,lane:e},c[e]=o}return this.measurementsCache=s,s},{key:!1,debug:()=>this.options.debug}),this.calculateRange=eE(()=>[this.getMeasurements(),this.getSize(),this.getScrollOffset(),this.options.lanes],(e,t,r,n)=>this.range=e.length>0&&t>0?function({measurements:e,outerSize:t,scrollOffset:r,lanes:n}){let o=e.length-1;if(e.length<=n)return{startIndex:0,endIndex:o};let a=eW(0,o,t=>e[t].start,r),i=a;if(1===n)for(;i<o&&e[i].end<r+t;)i++;else if(n>1){let l=Array(n).fill(0);for(;i<o&&l.some(e=>e<r+t);){let t=e[i];l[t.lane]=t.end,i++}let s=Array(n).fill(r+t);for(;a>=0&&s.some(e=>e>=r);){let t=e[a];s[t.lane]=t.start,a--}a=Math.max(0,a-a%n),i=Math.min(o,i+(n-1-i%n))}return{startIndex:a,endIndex:i}}({measurements:e,outerSize:t,scrollOffset:r,lanes:n}):null,{key:!1,debug:()=>this.options.debug}),this.getVirtualIndexes=eE(()=>{let e=null,t=null,r=this.calculateRange();return r&&(e=r.startIndex,t=r.endIndex),this.maybeNotify.updateDeps([this.isScrolling,e,t]),[this.options.rangeExtractor,this.options.overscan,this.options.count,e,t]},(e,t,r,n,o)=>null===n||null===o?[]:e({startIndex:n,endIndex:o,overscan:t,count:r}),{key:!1,debug:()=>this.options.debug}),this.indexFromElement=e=>{let t=this.options.indexAttribute,r=e.getAttribute(t);return r?parseInt(r,10):(console.warn(`Missing attribute name '${t}={index}' on measured element.`),-1)},this.shouldMeasureDuringScroll=e=>{var t;if(!this.scrollState||"smooth"!==this.scrollState.behavior)return!0;let r=this.scrollState.index??(null==(t=this.getVirtualItemForOffset(this.scrollState.lastTargetOffset))?void 0:t.index);if(void 0!==r&&this.range){let t=Math.max(this.options.overscan,Math.ceil((this.range.endIndex-this.range.startIndex)/2)),n=Math.max(0,r-t),o=Math.min(this.options.count-1,r+t);return e>=n&&e<=o}return!0},this.measureElement=e=>{if(!e)return void this.elementsCache.forEach((e,t)=>{e.isConnected||(this.observer.unobserve(e),this.elementsCache.delete(t))});let t=this.indexFromElement(e),r=this.options.getItemKey(t),n=this.elementsCache.get(r);n!==e&&(n&&this.observer.unobserve(n),this.observer.observe(e),this.elementsCache.set(r,e)),(!this.isScrolling||this.scrollState)&&this.shouldMeasureDuringScroll(t)&&this.resizeItem(t,this.options.measureElement(e,void 0,this))},this.resizeItem=(e,t)=>{var r;let n=this.measurementsCache[e];if(!n)return;let o=t-(this.itemSizeCache.get(n.key)??n.size);0!==o&&((null==(r=this.scrollState)?void 0:r.behavior)!=="smooth"&&(void 0!==this.shouldAdjustScrollPositionOnItemSizeChange?this.shouldAdjustScrollPositionOnItemSizeChange(n,o,this):n.start<this.getScrollOffset()+this.scrollAdjustments)&&this._scrollToOffset(this.getScrollOffset(),{adjustments:this.scrollAdjustments+=o,behavior:void 0}),this.pendingMeasuredCacheIndexes.push(n.index),this.itemSizeCache=new Map(this.itemSizeCache.set(n.key,t)),this.notify(!1))},this.getVirtualItems=eE(()=>[this.getVirtualIndexes(),this.getMeasurements()],(e,t)=>{let r=[];for(let n=0,o=e.length;n<o;n++){let o=t[e[n]];r.push(o)}return r},{key:!1,debug:()=>this.options.debug}),this.getVirtualItemForOffset=e=>{let t=this.getMeasurements();if(0!==t.length)return eI(t[eW(0,t.length-1,e=>eI(t[e]).start,e)])},this.getMaxScrollOffset=()=>{if(!this.scrollElement)return 0;if("scrollHeight"in this.scrollElement)return this.options.horizontal?this.scrollElement.scrollWidth-this.scrollElement.clientWidth:this.scrollElement.scrollHeight-this.scrollElement.clientHeight;{let e=this.scrollElement.document.documentElement;return this.options.horizontal?e.scrollWidth-this.scrollElement.innerWidth:e.scrollHeight-this.scrollElement.innerHeight}},this.getOffsetForAlignment=(e,t,r=0)=>{if(!this.scrollElement)return 0;let n=this.getSize(),o=this.getScrollOffset();return"auto"===t&&(t=e>=o+n?"end":"start"),"center"===t?e+=(r-n)/2:"end"===t&&(e-=n),Math.max(Math.min(this.getMaxScrollOffset(),e),0)},this.getOffsetForIndex=(e,t="auto")=>{e=Math.max(0,Math.min(e,this.options.count-1));let r=this.getSize(),n=this.getScrollOffset(),o=this.measurementsCache[e];if(!o)return;if("auto"===t)if(o.end>=n+r-this.options.scrollPaddingEnd)t="end";else{if(!(o.start<=n+this.options.scrollPaddingStart))return[n,t];t="start"}if("end"===t&&e===this.options.count-1)return[this.getMaxScrollOffset(),t];let a="end"===t?o.end+this.options.scrollPaddingEnd:o.start-this.options.scrollPaddingStart;return[this.getOffsetForAlignment(a,t,o.size),t]},this.scrollToOffset=(e,{align:t="start",behavior:r="auto"}={})=>{let n=this.getOffsetForAlignment(e,t),o=this.now();this.scrollState={index:null,align:t,behavior:r,startedAt:o,lastTargetOffset:n,stableFrames:0},this._scrollToOffset(n,{adjustments:void 0,behavior:r}),this.scheduleScrollReconcile()},this.scrollToIndex=(e,{align:t="auto",behavior:r="auto"}={})=>{e=Math.max(0,Math.min(e,this.options.count-1));let n=this.getOffsetForIndex(e,t);if(!n)return;let[o,a]=n,i=this.now();this.scrollState={index:e,align:a,behavior:r,startedAt:i,lastTargetOffset:o,stableFrames:0},this._scrollToOffset(o,{adjustments:void 0,behavior:r}),this.scheduleScrollReconcile()},this.scrollBy=(e,{behavior:t="auto"}={})=>{let r=this.getScrollOffset()+e,n=this.now();this.scrollState={index:null,align:"start",behavior:t,startedAt:n,lastTargetOffset:r,stableFrames:0},this._scrollToOffset(r,{adjustments:void 0,behavior:t}),this.scheduleScrollReconcile()},this.getTotalSize=()=>{var e;let t,r=this.getMeasurements();if(0===r.length)t=this.options.paddingStart;else if(1===this.options.lanes)t=(null==(e=r[r.length-1])?void 0:e.end)??0;else{let e=Array(this.options.lanes).fill(null),n=r.length-1;for(;n>=0&&e.some(e=>null===e);){let t=r[n];null===e[t.lane]&&(e[t.lane]=t.end),n--}t=Math.max(...e.filter(e=>null!==e))}return Math.max(t-this.options.scrollMargin+this.options.paddingEnd,0)},this._scrollToOffset=(e,{adjustments:t,behavior:r})=>{this.options.scrollToFn(e,{behavior:r,adjustments:t},this)},this.measure=()=>{this.itemSizeCache=new Map,this.laneAssignments=new Map,this.notify(!1)},this.setOptions(e)}scheduleScrollReconcile(){if(!this.targetWindow){this.scrollState=null;return}null==this.rafId&&(this.rafId=this.targetWindow.requestAnimationFrame(()=>{this.rafId=null,this.reconcileScroll()}))}reconcileScroll(){if(!this.scrollState||!this.scrollElement)return;if(this.now()-this.scrollState.startedAt>5e3){this.scrollState=null;return}let e=null!=this.scrollState.index?this.getOffsetForIndex(this.scrollState.index,this.scrollState.align):void 0,t=e?e[0]:this.scrollState.lastTargetOffset,r=t!==this.scrollState.lastTargetOffset;if(!r&&1.01>Math.abs(t-this.getScrollOffset())){if(this.scrollState.stableFrames++,this.scrollState.stableFrames>=1){this.scrollState=null;return}}else this.scrollState.stableFrames=0,r&&(this.scrollState.lastTargetOffset=t,this.scrollState.behavior="auto",this._scrollToOffset(t,{adjustments:void 0,behavior:"auto"}));this.scheduleScrollReconcile()}}let eW=(e,t,r,n)=>{for(;e<=t;){let o=(e+t)/2|0,a=r(o);if(a<n)e=o+1;else{if(!(a>n))return o;t=o-1}}return e>0?e-1:0},eU="u">typeof document?r.useLayoutEffect:r.useEffect;var eY=e.i(319342),e_=e.i(833376),eV=e.i(318798),eq=e.i(634791);let eK=(0,eq.create)((e,t)=>({likedMessages:new Set,isLiked:e=>t().likedMessages.has(e),toggleLike:t=>e(e=>{let r=new Set(e.likedMessages);return r.has(t)?r.delete(t):r.add(t),{likedMessages:r}})}));var eX=e.i(862855),eG=e.i(822533),eQ=e.i(750242),eZ=e.i(473422),eJ=e.i(77475),e0=e.i(103623),e1=e.i(637841),e2=e.i(365792);let e4=/([\p{L}\p{N}]+)(USDT|USDC|BUSD|TRY|USD)(?:\.P)?/iu,e6=/^([\p{L}\p{N}]+)(USDT|USDC|BUSD|TRY|USD)$/iu,e3=["USDT","USDC","BUSD","TRY","USD"];function e8(e){return e.replace(/[a-z]/g,e=>e.toUpperCase())}function e5(e){if("string"!=typeof e||!e.trim())return null;let t=e.replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").trim().match(e4);return t?e8(t[1])+t[2].toUpperCase():null}function e9(e){if(!e?.trim())return null;let t=e.match(/#([\p{L}\p{N}]+)(USDT|USDC|BUSD|TRY|USD)/iu);return t?e5(`${t[1]}${t[2]}`):null}function e7(e){if(null==e)return null;let t=(Array.isArray(e)?[...e]:String(e).split(",")).map(e=>e.trim().toUpperCase()).filter(e=>/^[A-Z][A-Z0-9]{1,9}$/.test(e));return 0===t.length?null:[...new Set(t)]}var te=e.i(483554),tt=e.i(407889),tr=e.i(416294),tn=e.i(13635);let to=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        height: 100%;
        min-height: 0;
        background: ${t.colorBgContainer};
        overflow: hidden;
    `,iconSidebarWrapper:e`
        position: relative;
        width: 64px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        min-height: 0;
    `,iconSidebar:e`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 8px 8px;
        width: 64px;
        flex: 1;
        min-height: 0;
        flex-shrink: 0;
        background: ${t.colorBgLayout};
        border-right: 1px solid ${t.colorBorderSecondary};
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    `,sidebarBottomHint:e`
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 46px;
        z-index: 10;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 6px;
        /* Tema değişse bile siyah kalmasın diye token bazlı veriyoruz */
        background: linear-gradient(to top, ${t.colorBgLayout} 40%, transparent 100%);
        color: ${t.colorTextSecondary};
        cursor: pointer;
    `,botIcon:e`
        width: 46px;
        height: 46px;
        border-radius: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: grab;
        transition: box-shadow 0.2s, transform 0.2s;
        flex-shrink: 0;
        position: relative;
        touch-action: none;

        &:hover {
            border-radius: 100px;
            transform: translateY(-1px);
        }
        &:active {
            cursor: grabbing;
        }
    `,botIconActive:e`
        border-radius: 100px;
    `,botIconDragging:e`
        opacity: 0.5;
    `,botIconDropTarget:e`
        outline: 2px dashed ${t.colorPrimary};
        outline-offset: 2px;
    `,botIconUnavailable:e`
        opacity: 0.4;
        filter: grayscale(1);

        &:hover {
            opacity: 0.65;
        }
    `,activeIndicator:e`
        position: absolute;
        left: -8px;
        width: 4px;
        border-radius: 0 4px 4px 0;
        background: ${t.colorText};
        transition: height 0.2s;
    `,chatArea:e`
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        overflow: hidden;
    `,channelHeader:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
        flex-shrink: 0;
        min-height: 38px;
    `,channelHeaderIcon:e`
        font-size: 16px;
        flex-shrink: 0;
    `,channelHeaderInfo:e`
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
    `,headerCloseBtn:e`
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,channelName:e`
        font-size: 13px;
        font-weight: 600;
        color: ${t.colorText};
        line-height: 1.2;
    `,channelDesc:e`
        font-size: 11px;
        color: ${t.colorTextTertiary};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `,messagesAreaWrapper:e`
        position: relative;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    `,backBottomButton:e`
        position: absolute;
        right: 16px;
        bottom: 16px;
        z-index: 20;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 0;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 50%;
        color: ${t.colorTextSecondary};
        background: color-mix(in srgb, ${t.colorBgElevated} 88%, transparent);
        box-shadow: 0 3px 10px rgb(0 0 0 / 22%);
        cursor: pointer;
        opacity: 0;
        pointer-events: none;
        transform: translateY(12px);
        transition: opacity 0.15s, transform 0.15s, color 0.15s;

        &[data-visible='true'] {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
        }

        &:hover {
            color: ${t.colorText};
        }

        &:focus-visible {
            outline: 2px solid ${t.colorPrimary};
            outline-offset: 2px;
        }
    `,messagesArea:e`
        flex: 1;
        overflow-y: auto;
        padding: 8px 12px;
        background: ${t.colorBgLayout};

        &::-webkit-scrollbar {
            width: 4px;
        }
        &::-webkit-scrollbar-thumb {
            background: ${t.colorBorderSecondary};
            border-radius: 2px;
        }

        [data-bot-chat-visible-content],
        [data-bot-chat-visible-content] * {
            font-size: ${12}px;
            line-height: 1.5;
        }

        [data-bot-chat-time] {
            font-size: ${12}px;
        }

        [data-bot-chat-visible-content] strong {
            display: inline;
            color: inherit;
            font-size: inherit;
            font-weight: 600;
            margin: 0;
        }

        [data-bot-chat-visible-content] a {
            color: #5dade2;
            text-decoration: none;
            font-weight: 500;
            
            &:hover {
                text-decoration: underline;
            }
        }
    `,symbolLinksWrap:e`
        a[href*='#filter-'] {
            cursor: pointer !important;
            color: #5dade2 !important;
        }
    `,unreadBadge:e`
        position: absolute;
        right: 0;
        bottom: 0;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: ${a.RED};
        color: ${t.colorTextLightSolid};
        font-size: 10px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        z-index: 1;
    `,messageTime:e`
        position: absolute;
        right: 8px;
        bottom: 4px;
        font-size: ${12}px;
        color: ${t.colorTextTertiary};
        display: flex;
        align-items: center;
        z-index: 10;
    `,messageExchangeIcon:e`
        position: absolute;
        left: 12px;
        bottom: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        margin: 0;
        border: none;
        background: none;
        color: ${t.colorTextTertiary};
        cursor: pointer;
        z-index: 10;
        transition: color 0.15s;
        &:hover {
            color: ${t.colorTextSecondary};
        }
    `,messageActions:e`
        display: inline-flex;
        flex: none;
        flex-direction: row;
        align-items: center;
        gap: 0;
        padding: 2px;
        border-radius: ${t.borderRadius}px;
        background: ${t.colorFillTertiary};
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s;
    `,messageActionButton:e`
        appearance: none;
        display: inline-flex;
        flex: 0 0 24px;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 4px;
        color: ${t.colorTextSecondary};
        background: transparent;
        cursor: pointer;
        transition: color 0.15s, background-color 0.15s;

        &:hover {
            color: ${t.colorText};
            background: ${t.colorFillSecondary};
        }

        &:focus-visible {
            color: ${t.colorText};
            outline: 2px solid ${t.colorPrimary};
            outline-offset: -2px;
            background: ${t.colorFillSecondary};
        }

        &[aria-pressed='true'] {
            color: ${a.RED};
        }
    `,searchBtn:e`
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,searchBtnActive:e`
        background: ${t.colorPrimaryBg};
        color: ${t.colorPrimary};

        &:hover {
            background: ${t.colorPrimaryBgHover};
            color: ${t.colorPrimary};
        }
    `,searchInputWrapper:e`
        display: flex;
        align-items: center;
        gap: 4px;
        background: ${t.colorFillQuaternary};
        border-radius: 6px;
        padding: 0 6px;
        height: 26px;
        max-width: 125px;
        border: 1px solid ${t.colorBorderSecondary};
        transition: border-color 0.2s;

        &:focus-within {
            border-color: ${t.colorPrimary};
        }
    `,searchInput:e`
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: ${t.colorText};
        font-size: 12px;
        line-height: 1;

        &::placeholder {
            color: ${t.colorTextQuaternary};
        }
    `,searchClear:e`
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${t.colorTextTertiary};
        flex-shrink: 0;
        transition: color 0.15s;

        &:hover {
            color: ${t.colorText};
        }
    `,searchCount:e`
        font-size: 11px;
        color: ${t.colorTextTertiary};
        white-space: nowrap;
        flex-shrink: 0;
    `,subTypeBtns:e`
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
    `,subTypeBtn:e`
        width: 24px;
        min-width: 24px;
        height: 22px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 500;
        color: ${t.colorTextSecondary};
        background: ${t.colorFillTertiary};
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;

        &:hover {
            background: ${t.colorFillSecondary};
            color: ${t.colorText};
        }
    `,subTypeBtnActive:e`
        background: ${t.colorPrimaryBg};
        color: ${t.colorPrimary};
        border: 1px solid ${t.colorPrimaryBorder};
        &:hover {
            background: ${t.colorPrimaryBgHover};
            color: ${t.colorPrimary};
        }
    `,emptyState:e`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        color: ${t.colorTextTertiary};
        font-size: 14px;
    `,marketNoticeText:e`
        max-width: 300px;
        text-align: center;
        line-height: 1.6;
        color: ${t.colorTextSecondary};
    `,marketNoticeBtn:e`
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        border: 1px solid ${t.colorPrimary};
        background: ${t.colorPrimary}20;
        color: ${t.colorPrimary};
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;

        &:hover {
            background: ${t.colorPrimary}33;
            box-shadow: 0 0 0 1px ${t.colorPrimary}20;
        }
    `,messageList:e`
        display: flex;
        flex-direction: column;
        gap: ${0}px !important;
        width: 100%;

        [data-bot-chat-vrow] {
            margin: 0 !important;
            padding-top: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-bottom: ${0}px !important;
            box-sizing: border-box;
        }
    `,dateGroup:e`
        display: flex;
        flex-direction: column;
        gap: ${0}px;
    `,dateDivider:e`
        display: flex;
        justify-content: center;
        padding: 8px 0 2px;
        flex-shrink: 0;
    `,dateDividerLabel:e`
        font-size: 11px;
        font-weight: 500;
        color: ${t.colorTextTertiary};
        background: ${t.colorFillTertiary};
        padding: 4px 12px;
        border-radius: 12px;
        letter-spacing: 0.02em;
    `,dateDividerLabelHidden:e`
        visibility: hidden;
    `,stickyDateBadge:e`
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        justify-content: center;
        padding: 8px 0 4px;
        margin-bottom: 4px;
        flex-shrink: 0;
        pointer-events: none;
    `,stickyDateBadgeInner:e`
        font-size: 12px;
        font-weight: 600;
        color: ${t.colorTextSecondary};
        background: ${t.colorBgContainer};
        padding: 6px 14px;
        border-radius: 14px;
        box-shadow: 0 2px 8px ${t.colorBgLayout};
        border: 1px solid ${t.colorBorderSecondary};
        letter-spacing: 0.02em;
    `,messageRow:e`
        position: relative;
        width: 100%;

        &:hover [data-bot-chat-actions],
        &:focus-within [data-bot-chat-actions] {
            pointer-events: auto;
            opacity: 1;
        }

        @media (hover: none) and (pointer: coarse) {
            & [data-bot-chat-actions] {
                pointer-events: auto;
                opacity: 1;
            }
        }

        /* bubblePadding (üst/alt dahil) messageList'teki padding:0 kuralını ezer */
        & [data-bot-chat-bubble-inner] {
            padding: ${"10px 12px 18px"} !important;
            display: inline-block;
            width: fit-content;
            max-width: 100%;
        }
    `,messageLayout:e`
        display: flex;
        align-items: flex-end;
        gap: 8px;
        width: 100%;
        min-width: 0;
        padding: 4px 0 2px;
    `,messageBubble:e`
        position: relative;
        overflow: hidden;
        flex: 0 1 auto;
        width: fit-content;
        min-width: 0;
        max-width: calc(100% - 60px);
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 12px;
        background: ${t.colorBgElevated};
        color: ${t.colorText};
        box-shadow: none;
        overflow-wrap: anywhere;

        @media (hover: none) and (pointer: coarse) {
            max-width: calc(100% - 60px);
        }
    `})),ta="#d7d7d7";function ti(e,t){return e.exchanges.includes((0,eJ.normalizeExchange)(t))}function tl(e,t){let r=t.toUpperCase();return e.market_types.includes(r)}function ts(e,t,r,n){return`${e}::${(0,eJ.normalizeExchange)(t)}::${r}::${n??"all"}`}let tc=(0,r.memo)(function({avatar:e,alt:r,className:n,size:o=36}){if(!(/\.(png|jpg|jpeg|gif|svg|webp)(\?|$)/i.test(e)||e.startsWith("/")||e.startsWith("http")))return(0,t.jsx)("span",{className:n,style:{fontSize:o},children:e});let a=e.startsWith("/bot_logos/")&&/\.png(\?|$)/i.test(e)?e.replace(/\.png(?=\?|$)/i,".webp"):null,i=(0,t.jsx)("img",{src:e,alt:r,className:n,width:o,height:o,decoding:"async",style:{objectFit:"contain"}});return a?(0,t.jsxs)("picture",{children:[(0,t.jsx)("source",{srcSet:a,type:"image/webp"}),i]}):i});function tu(){let e={},t=new Set,r=()=>t.forEach(e=>e());return{subscribe:e=>(t.add(e),()=>t.delete(e)),getTotal:t=>{let r=0;for(let n of t)r+=e[n]??0;return r},addDeltas:t=>{let n=e;for(let[r,o]of Object.entries(t))o&&(n===e&&(n={...e}),n[r]=(n[r]??0)+o);n!==e&&(e=n,r())},clear:t=>{(e[t]??0)!==0&&(e={...e,[t]:0},r())}}}tc.displayName="BotChat.Avatar";let td={type:"spring",stiffness:400,damping:35},tp=(0,r.memo)(function({channel:e,active:n,dragging:o,dropTarget:a,layoutEnabled:i,unavailable:l,tooltip:s,activeUnreadCount:c,unreadStore:u,styles:d,onSelect:p,onDragStart:f,onDragOver:m,onDragLeave:h,onDrop:g,onDragEnd:y}){let b=(0,r.useMemo)(()=>e.subIds?.map(e=>e.id)??[e.id],[e]),x=(0,r.useCallback)(()=>n?0:u.getTotal(b),[n,b,u]),v=(0,r.useSyncExternalStore)(u.subscribe,x,()=>0),w=n?c:v;return(0,t.jsx)(eV.motion.div,{layout:i,transition:td,children:(0,t.jsxs)("div",{draggable:!0,title:s,"aria-disabled":l||void 0,onDragStart:t=>f(t,e.id),onDragOver:t=>m(t,e.id),onDragLeave:h,onDrop:t=>g(t,e.id),onDragEnd:y,className:[d.botIcon,n?d.botIconActive:"",o?d.botIconDragging:"",a?d.botIconDropTarget:"",l?d.botIconUnavailable:""].filter(Boolean).join(" "),style:{background:n?ta:`${ta}33`},onClick:()=>p(e.id),children:[(0,t.jsx)("div",{className:d.activeIndicator,style:{height:20*!!n}}),(0,t.jsx)(tc,{avatar:e.botAvatar,alt:e.botName,size:40}),!l&&w>0&&(0,t.jsx)("span",{className:d.unreadBadge,children:w>999?"999+":w})]})})});tp.displayName="BotChat.ChannelIcon";let tf=[],tm=(0,r.memo)(function({messageId:e,fallbackText:o,groupClassName:i,buttonClassName:l}){let{t:s}=(0,n.useTranslation)("botChat"),c=eK(t=>t.isLiked(e)),u=eK(e=>e.toggleLike),d=s("actions.like"),p=s("actions.copy"),f=(0,r.useCallback)(()=>u(e),[e,u]),m=(0,r.useCallback)(async e=>{let t=e.currentTarget.closest('[data-bot-chat-vrow-type="message"]'),r=t?.querySelector("[data-bot-chat-visible-content]"),n=r?.innerText.trim()||o;try{if(!n||"u"<typeof navigator||!navigator.clipboard?.writeText)throw Error("Clipboard API unavailable");await navigator.clipboard.writeText(n),eY.message.success(s("actions.copySuccess"))}catch{eY.message.error(s("actions.copyError"))}},[o,s]);return(0,t.jsxs)("div",{className:i,role:"group","aria-label":s("actions.label"),"data-bot-chat-actions":!0,children:[(0,t.jsx)("button",{type:"button",className:l,"aria-label":d,"aria-pressed":c,title:d,onClick:f,children:(0,t.jsx)(eC.Heart,{"aria-hidden":"true",focusable:"false",size:16,stroke:c?a.RED:"#733",fill:c?a.RED:"transparent"})}),(0,t.jsx)("button",{type:"button",className:l,"aria-label":p,title:p,onClick:m,children:(0,t.jsx)(ej.Copy,{"aria-hidden":"true",focusable:"false",size:16})})]})});tm.displayName="BotChat.MessageActions";let th=/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|`([^`\n]+)`|(\r?\n)/g,tg=(0,r.memo)(function({msg:e,rowStyles:o,navigateToSymbol:a,formatMessageTime:i,tzLabel:l,onOpenSearchWithSymbol:s,activeExchange:c,activeMarketType:u,onPrefetchMouseEnter:d,onPrefetchMouseDown:p,onPrefetchMouseLeave:f}){let{t:m}=(0,n.useTranslation)("botChat"),h=(0,r.useMemo)(()=>{var t,r;return t=e.content,r=t?.trim()?t.replace(/#([\p{L}\p{N}]+)(USDT|USDC|BUSD|USD)/giu,(e,t,r)=>{let n=e8(t)+r.toUpperCase();return`[#${n}](#filter-${encodeURIComponent(n)})`}):t,r?.trim()?r.replace(/\\n/g,"\n").replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,"[$2]($1)").replace(/<strong[^>]*>([^<]*)<\/strong>/gi,(e,t)=>`**${(t||"").trim()}**`).replace(/<b[^>]*>([^<]*)<\/b>/gi,(e,t)=>`**${(t||"").trim()}**`).replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>\s*<p[^>]*>/gi,"\n\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"'):r},[e.content]),g=(0,r.useMemo)(()=>h.replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/(`{1,3})([\s\S]*?)\1/g,"$2").replace(/(\*\*|__)(.*?)\1/g,"$2").replace(/(\*|_)(.*?)\1/g,"$2").replace(/~~(.*?)~~/g,"$1").replace(/^\s{0,3}>\s?/gm,"").replace(/\\([\\`*{}\[\]()#+\-.!_>])/g,"$1").trim(),[h]),y=(0,r.useMemo)(()=>(function(e){let r=[],n=0,o=0;for(let a of e.matchAll(th)){let i=a.index??0;i>n&&r.push(e.slice(n,i));let[l,s,c,u,d,p,f,m]=a,h=`md-${o++}`;if(void 0!==s&&void 0!==c){let e=function(e){let t=e.trim();if(!t)return null;if(t.startsWith("#")||t.startsWith("/"))return t;try{let e=new URL(t);return"http:"===e.protocol||"https:"===e.protocol||"mailto:"===e.protocol?t:null}catch{return null}}(c);if(e){let n=/^https?:/i.test(e);r.push((0,t.jsx)("a",{href:e,...n?{target:"_blank",rel:"noopener noreferrer"}:{},children:s},h))}else r.push(s)}else void 0!==u||void 0!==d?r.push((0,t.jsx)("strong",{children:u??d},h)):void 0!==p?r.push((0,t.jsx)("del",{children:p},h)):void 0!==f?r.push((0,t.jsx)("code",{children:f},h)):void 0!==m?r.push((0,t.jsx)("br",{},h)):r.push(l);n=i+l.length}return n<e.length&&r.push(e.slice(n)),r})(h),[h]),{exchange:b,exchangeLabel:x,exchangeLink:v,marketType:w,prefetchSymbol:S,symbol:k}=(0,r.useMemo)(()=>{let t=e5(e.symbol)||e9(e.content),r=e.marketType?.toLowerCase()||"",n=e.exchange||(/binance/i.test(e.content)?"binance":/bybit/i.test(e.content)?"bybit":null),o=t&&n?function(e,t,r){let n=t.toLowerCase(),o=r.toLowerCase(),a=e,i="USDT";if(e.endsWith("USDT")?(a=e.slice(0,-4),i="USDT"):e.endsWith("USDC")?(a=e.slice(0,-4),i="USDC"):e.endsWith("USD")?(a=e.slice(0,-3),i="USD"):e.endsWith("BUSD")&&(a=e.slice(0,-4),i="BUSD"),"binance"===n)if("spot"===o)return`https://www.binance.com/trade/${a}_${i}?type=spot`;else return`https://www.binance.com/en/futures/${e}`;if("bybit"===n)if("spot"===o)return`https://www.bybit.com/trade/spot/${a}/${i}`;else if("USDC"===i)return`https://www.bybit.com/trade/futures/usdc/${a}-PERP`;else return`https://www.bybit.com/trade/usdt/${a}USDT`;return""}(t,n,r):"";return{exchange:n,exchangeLabel:n?n.charAt(0).toUpperCase()+n.slice(1):"",exchangeLink:o,marketType:r,prefetchSymbol:e9(e.content),symbol:t}},[e.content,e.exchange,e.marketType,e.symbol]),j=(0,r.useMemo)(()=>S?{exchange:c,marketType:u}:void 0,[c,u,S]),$=(0,r.useCallback)(e=>{if(k){if(!b)return void eY.message.error(m("exchangeNotSupported"));if((e?.ctrlKey||e?.metaKey)&&v)return void(0,te.openExternalUrl)(v);a(k,{exchange:b,scrollWatchlist:!0,..."spot"===w||"futures"===w?{marketType:w}:{}})}},[v,b,w,a,k,m]),C=(0,r.useCallback)(e=>{let t=e.target instanceof Element?e.target:e.target?.parentElement,r=t?.closest?.("a");if(!r)return;e.stopPropagation();let n=function(e){let t="",r=(e.getAttribute("href")||"").trim();if(r.startsWith("#"))t=r;else if(r&&!/^https?:/i.test(r)&&r.includes("#"))t=r.slice(r.indexOf("#"));else try{t=new URL(e.href).hash}catch{return null}let n="#filter-";if(!t.startsWith(n))return null;let o=t.slice(n.length);try{o=decodeURIComponent(o)}catch{}return(o=o.trim())?e5(o)||o:null}(r);n&&(e.preventDefault(),s(n))},[s]);return(0,t.jsx)("div",{className:o.messageRow,children:(0,t.jsxs)("div",{className:o.messageLayout,children:[(0,t.jsx)("div",{className:o.messageBubble,children:(0,t.jsxs)("div",{"data-bot-chat-bubble-inner":!0,role:k?"button":void 0,tabIndex:k?0:void 0,onClick:k?$:void 0,onMouseEnter:S&&j&&d?()=>d(S,j):void 0,onMouseLeave:S?f:void 0,onMouseDown:S&&j&&p?()=>p(S,j):void 0,onKeyDown:k?e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),$())}:void 0,style:{cursor:k?"pointer":void 0},children:[(0,t.jsx)("span",{className:o.symbolLinksWrap,"data-bot-chat-visible-content":!0,onClick:C,children:y}),v&&(0,t.jsx)("button",{type:"button",title:m("openOn",{exchange:x}),className:o.messageExchangeIcon,onClick:e=>{e.stopPropagation(),(0,te.openExternalUrl)(v)},"aria-label":x,children:(0,t.jsx)(eN.SquareArrowOutUpRight,{size:14,strokeWidth:2})}),(0,t.jsx)("div",{className:o.messageTime,"data-bot-chat-time":!0,title:l,children:i(e.timestamp)})]})}),(0,t.jsx)(tm,{buttonClassName:o.messageActionButton,fallbackText:g,groupClassName:o.messageActions,messageId:e.id})]})})},function(e,t){let r=e.msg,n=t.msg;return r.id===n.id&&r.content===n.content&&r.exchange===n.exchange&&r.symbol===n.symbol&&r.marketType===n.marketType&&r.timestamp===n.timestamp&&e.rowStyles===t.rowStyles&&e.navigateToSymbol===t.navigateToSymbol&&e.formatMessageTime===t.formatMessageTime&&e.tzLabel===t.tzLabel&&e.onOpenSearchWithSymbol===t.onOpenSearchWithSymbol&&e.activeExchange===t.activeExchange&&e.activeMarketType===t.activeMarketType&&e.onPrefetchMouseEnter===t.onPrefetchMouseEnter&&e.onPrefetchMouseDown===t.onPrefetchMouseDown&&e.onPrefetchMouseLeave===t.onPrefetchMouseLeave});tg.displayName="BotChat.MessageRow";let ty=["binance","bybit"],tb=["FUTURES"],tx=[{id:"m1",botName:"M1-A",botAvatar:"/bot_logos/m1-a.png",description:"channelDescriptions.m1",exchanges:ty,market_types:tb},{id:"m1-premium",botName:"M1 Premium",botAvatar:"/bot_logos/m1-premium.png",description:"channelDescriptions.m1-premium",exchanges:ty,market_types:tb},{id:"fr",subIds:[{id:"fr",botName:"Simple Earn",hint:"SE",isToggle:!0,msgSearchTerm:">SE"}],botName:"FR",botAvatar:"/bot_logos/fr.png",description:"channelDescriptions.fr",exchanges:ty,market_types:tb},{id:"v3",botName:"V3-A",botAvatar:"/bot_logos/v3-a.png",description:"channelDescriptions.v3",exchanges:ty,market_types:tb},{id:"hammer",botName:"Hammer",botAvatar:"/bot_logos/hammer.png",description:"channelDescriptions.hammer",exchanges:ty,market_types:tb},{id:"hammer-pro",subIds:[{id:"hammer-pro",botName:"Standard",hint:"S"},{id:"1d-hammer-pro",botName:"1 Day",hint:"1D"}],botName:"Hammer Pro",botAvatar:"/bot_logos/hammer-pro.png",description:"channelDescriptions.hammer-pro",exchanges:ty,market_types:tb},{id:"hammer-pro-plus",botName:"Hammer Pro Plus",botAvatar:"/bot_logos/hammer-pro-plus.png",description:"channelDescriptions.hammer-pro-plus",exchanges:ty,market_types:tb},{id:"4s",botName:"4S",botAvatar:"/bot_logos/4s.png",description:"channelDescriptions.4s",exchanges:ty,market_types:["SPOT","FUTURES"]},{id:"4sniper",subIds:[{id:"4sniper",botName:"Standard",hint:"S"},{id:"1dws",botName:"1 Day & Week",hint:"1"}],botName:"4S Sniper",botAvatar:"/bot_logos/4s-sniper.png",description:"channelDescriptions.4sniper",exchanges:ty,market_types:tb},{id:"div",botName:"Divergence",botAvatar:"/bot_logos/divergence.png",description:"channelDescriptions.div",exchanges:ty,market_types:tb},{id:"duyuru",botName:"Binance Announcement",botAvatar:"/bot_logos/binance.png",description:"channelDescriptions.duyuru",exchanges:["binance"],market_types:["SPOT","FUTURES"]},{id:"duyuru-bybit",botName:"Bybit Announcement",botAvatar:"/bot_logos/bybit.png",description:"channelDescriptions.duyuru-bybit",exchanges:["bybit"],market_types:["SPOT","FUTURES"]}],tv="botchat-channel-order",tw="botchat-active-channel",tS="botchat-active-sub-channel",tk=new Set([...tx.map(e=>e.id),...tx.flatMap(e=>e.subIds?.map(e=>e.id)??[])]),tj="wss://bots.visivero.com/ws";function t$(e){let t=e.trim().replace(/\/+$/,"");return t?t.endsWith("/ws")?t:`${t}/ws`:tj}let tC="fr-bybit";function tT(e,t){return"fr"===e&&"bybit"===(0,eJ.normalizeExchange)(t)?tC:"duyuru-bybit"===e?"duyuru":e}function tM(e){return e.toLowerCase().includes("duyuru")}function tN(e){let t=new Date(e);return`${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}-${String(t.getUTCDate()).padStart(2,"0")}`}function tE(e,t){let r=(e/1e3+t)*1e3,n=tN(r),o=(Date.now()/1e3+t)*1e3,a=new Date(o),i=tN(o),l=new Date(Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate()-1)),s=`${l.getUTCFullYear()}-${String(l.getUTCMonth()+1).padStart(2,"0")}-${String(l.getUTCDate()).padStart(2,"0")}`;return n===i?tr.default.t("botChat:dateLabels.today"):n===s?tr.default.t("botChat:dateLabels.yesterday"):(0,tt.formatDate)(new Date(r),{timeZone:"UTC",day:"numeric",month:"long"})}function tI(e){return e.map(e=>({id:e.id,content:e.message,exchange:e.exchange,symbol:e5(e.symbol),marketType:e.marketType,timestamp:new Date(e.createdAt).getTime()}))}function tD(e){let t=e.trim();if(e6.test(t)){let e=e5(t);if(e)return{symbol:e}}return{message:e}}function tP(e,t){let r=t.trim();if(!r)return!0;let n=tD(r);return"symbol"in n?e.symbol===n.symbol:e.content.toLowerCase().includes(n.message.toLowerCase())}async function tO(e,t,r,n,o,a){let i=t.trim();if(!i)return null;let l=new URLSearchParams({bot_id:tT(e,r),limit:String(20),exchange:(0,eJ.normalizeExchange)(r)});tM(e)||(l.set("market_type",n),null!=o&&l.set("quote",o));let s=tD(i);"symbol"in s?l.set("symbol",s.symbol):l.set("message",s.message),a&&l.set("before",a);try{let e=await (0,tn.fetchClientApi)(`/api/bot-messages?${l}`);if(!e.ok)return null;let t=await e.json();return{messages:tI(t.messages),hasMore:t.hasMore}}catch{return null}}let tz=({onClose:e,styleBundle:n,t:o})=>{let{styles:a,cx:i}=n,l=(0,eQ.useNavigateToSymbol)(),{handleRowMouseEnter:s,handleRowMouseDown:c,handleHoverAreaMouseLeave:u}=(0,eZ.useSymbolHoverPrefetch)(),d=(0,r.useRef)({handleHoverAreaMouseLeave:u,handleRowMouseDown:c,handleRowMouseEnter:s,navigateToSymbol:l});(0,r.useLayoutEffect)(()=>{d.current={handleHoverAreaMouseLeave:u,handleRowMouseDown:c,handleRowMouseEnter:s,navigateToSymbol:l}},[u,c,s,l]);let f=(0,r.useCallback)((e,t)=>d.current.navigateToSymbol(e,t),[]),m=(0,r.useCallback)((e,t)=>d.current.handleRowMouseEnter(e,t),[]),h=(0,r.useCallback)((e,t)=>d.current.handleRowMouseDown(e,t),[]),g=(0,r.useCallback)(()=>d.current.handleHoverAreaMouseLeave(),[]),y=(0,e0.useExchange)(),b=(0,e0.useMarketType)(),x=(0,eX.useQuoteAssets)(),v=(0,r.useMemo)(()=>{let e;return(e=e7(x))?[...e].sort().join(","):null},[x]),w=(0,r.useRef)(y);w.current=y;let S=(0,r.useRef)(b);S.current=b;let k=(0,r.useRef)(v);k.current=v;let[j,$]=(0,r.useState)(()=>[...tx]),[C,T]=(0,r.useState)(()=>{let e=window.localStorage.getItem(tw);return e&&tx.some(t=>t.id===e)?e:tx[0]?.id??"4s"}),[M,N]=(0,r.useState)(null),[E,I]=(0,r.useState)(null),[D,P]=(0,r.useState)(!1),O=(0,e2.useLazyRef)(()=>({})),[,z]=(0,r.useState)(0),[A,R]=(0,r.useState)(null),[L,F]=(0,r.useState)(!1),B=(0,e2.useLazyRef)(tu),[H,U]=(0,r.useState)(0),[Y,_]=(0,r.useState)(!1),[V,q]=(0,r.useState)(!1),[K,X]=(0,r.useState)(""),[G,Q]=(0,r.useState)(""),[Z,J]=(0,r.useState)(!1),[ee,et]=(0,r.useState)(!1),[er,en]=(0,r.useState)(!1),[eo,ea]=(0,r.useState)(null),ei=(0,r.useRef)(G);ei.current=G;let[el,es]=(0,r.useState)({}),[ec,eu]=(0,r.useState)(null),[ed,ep]=(0,r.useState)(!1),[ef,em]=(0,r.useState)(!1),[eh,eg]=(0,r.useState)(!1),ey=(0,r.useRef)(""),ex=(0,r.useRef)(!1),ev=(0,r.useRef)(null),ej=(0,r.useRef)(!1),[eC,eN]=(0,r.useState)(!1),eE=(0,r.useRef)(!1),[eI,eD]=(0,r.useState)(null),[eP,eO]=(0,r.useState)({label:null,hiddenDividerDateKey:null}),eA=(0,r.useRef)(null),eR=(0,r.useRef)(null),eF=(0,r.useRef)(null),eW=(0,r.useRef)(null),[eV,eq]=(0,r.useState)(!1),eK=(0,r.useRef)({}),e4=(0,r.useRef)(tx[0]?.id??"4s"),e6=(0,e2.useLazyRef)(()=>new Set),e8=(0,r.useRef)(null),te=(0,r.useRef)(!0),to=(0,r.useRef)(0),ta=(0,r.useRef)({}),td=(0,r.useRef)(null),tm=(0,r.useRef)(null),th=(0,r.useRef)(!1),ty=(0,r.useRef)(!1);e4.current=C;let tb=(0,r.useMemo)(()=>{let e=[],t=[];for(let r of j)ti(r,y)&&(tl(r,b)?e:t).push(r);return[...e,...t]},[j,y,b]),tD=(0,r.useMemo)(()=>tb.filter(e=>tl(e,b)),[tb,b]);(0,r.useEffect)(()=>{0!==tD.length&&(tb.some(e=>e.id===C)||T(tD[0].id))},[tb,tD,C]);let tz=(0,r.useRef)(null);(0,r.useEffect)(()=>{tz.current===b||0!==tD.length&&(tz.current=b,tD.some(e=>e.id===C)||T(tD[0].id))},[b,tD,C]);let tA=tb.find(e=>e.id===C)||tD[0]||tb[0],tR=null!=tA&&!tl(tA,b),tL=tA?.subIds?.length?eI??tA.subIds[0].id:C,tF=(0,r.useRef)(tL);tF.current=tL;let tB=(0,r.useMemo)(()=>ts(tL,y,b,v),[tL,y,b,v]),tH=(0,r.useRef)(tB);tH.current=tB;let tW=(0,r.useCallback)((e,t)=>{let r=O.current;r[e]!==t&&(O.current={...r,[e]:t},tH.current===e&&z(e=>e+1))},[]);(0,r.useEffect)(()=>{tA?.subIds?.length?eD(e=>tA.subIds.some(t=>t.id===e)?e:tA.subIds[0].id):eD(null)},[C,tA?.id,tA?.subIds]),(0,r.useEffect)(()=>{window.localStorage.setItem(tw,C)},[C]),(0,r.useEffect)(()=>{eI?window.localStorage.setItem(tS,eI):window.localStorage.removeItem(tS)},[eI]);let tU=(0,r.useMemo)(()=>tA?.subIds?.find(e=>e.isToggle&&e.msgSearchTerm&&el[e.id])??null,[tA?.subIds,el]),tY=tU?.msgSearchTerm?.trim()??"";ey.current=tY;let t_=(0,eX.useSelectedSymbol)(),tV=(0,r.useMemo)(()=>t_?e5(t_):null,[t_]),tq=(0,eG.useTimezoneStore)(e=>e.offsetSec),tK=(0,r.useMemo)(()=>eG.TIMEZONE_OPTIONS.find(e=>e.offsetSec===tq)?.short??`UTC${tq>=0?"+":""}${tq/3600}`,[tq]),tX=(0,r.useCallback)(e=>{let t=(e/1e3+tq)*1e3;return(0,tt.formatDate)(new Date(t),{timeZone:"UTC",hour:"2-digit",minute:"2-digit",hour12:!1})},[tq]),tG=(0,r.useCallback)(()=>{let e=eW.current;if(!e)return;let{scrollTop:t,clientHeight:r,scrollHeight:n}=e;eq(n>r&&t+r<n-4)},[]);(0,r.useEffect)(()=>{tG();let e=eW.current;if(!e)return;let t=new ResizeObserver(tG);return t.observe(e),()=>t.disconnect()},[tb.length,tG]);let tQ=(0,r.useCallback)((e,t)=>{N(t),e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t)},[]),tZ=(0,r.useCallback)((e,t)=>{e.preventDefault(),e.dataTransfer.dropEffect="move",I(e=>e===t?e:t)},[]),tJ=(0,r.useCallback)(()=>I(null),[]),t0=(0,r.useCallback)((e,t)=>{if(e.preventDefault(),I(null),!M||M===t)return void N(null);let r=j.findIndex(e=>e.id===M),n=j.findIndex(e=>e.id===t);if(r<0||n<0)return void N(null);let o=[...j],[a]=o.splice(r,1);o.splice(n,0,a),$(o);try{localStorage.setItem(tv,JSON.stringify(o.map(e=>e.id)))}catch{}N(null)},[M,j]),t1=(0,r.useCallback)(()=>{N(null),I(null)},[]),t2=(0,r.useCallback)(async(e,t)=>{let r=(0,eJ.normalizeExchange)(w.current),n=S.current,o=k.current,a=new URLSearchParams({bot_id:tT(e,r),limit:String(20),exchange:r});tM(e)||(a.set("market_type",n),null!=o&&a.set("quote",o)),t&&a.set("before",t);try{let e=await (0,tn.fetchClientApi)(`/api/bot-messages?${a}`);if(!e.ok)return null;let t=await e.json();return{messages:tI(t.messages),hasMore:t.hasMore}}catch{return null}},[]);(0,r.useEffect)(()=>{let e=G.trim();if(!e||tR){ea(null),J(!1),en(!1),et(!1);return}let t=!1;return J(!0),en(!1),tO(tL,e,y,b,v).then(e=>{t||(J(!1),e?(ea(e.messages),en(e.hasMore)):(ea([]),en(!1)))}),()=>{t=!0}},[tL,G,y,b,v,tR]),(0,r.useEffect)(()=>{if(!tY||tR){eu(null),ep(!1),em(!1),eg(!1);return}let e=!1;return ep(!0),em(!1),tO(tL,tY,y,b,v).then(t=>{e||(ep(!1),t?(eu(t.messages),em(t.hasMore)):(eu([]),em(!1)))}),()=>{e=!0}},[tL,tY,y,b,v,tR]),(0,r.useEffect)(()=>{if(!tL||tR)return;let e=ts(tL,y,b,v);if(null!=O.current[e])return void R(null);let t=!1,r=null;R(e);let n=async(o=0)=>{let a=await t2(tL);if(t)return;if(a){R(t=>t===e?null:t),tW(e,{messages:a.messages,hasMore:a.hasMore});return}let i=Math.min(15e3,1e3*2**Math.min(o,4));r=window.setTimeout(()=>{r=null,n(o+1)},i)};return n(),()=>{t=!0,null!==r&&window.clearTimeout(r)}},[tL,y,b,v,tR,tW,t2]),(0,r.useEffect)(()=>{let e=()=>{if(!tL||A||tR)return;let e=ts(tL,w.current,S.current,k.current);t2(tL).then(t=>{t&&tW(e,{messages:t.messages,hasMore:t.hasMore})})};return window.addEventListener("focus",e),()=>window.removeEventListener("focus",e)},[tL,A,tR,tW]),(0,r.useEffect)(()=>{let e=function(){let e=(ew.default.env.NEXT_PUBLIC_BOT_WS_URL||ew.default.env.NEXT_PUBLIC_WS_URL||"").trim();if(!e)return tj;try{if(e.startsWith("/")){let t=`${window.location.protocol}//${window.location.host}`,r=new URL(e,t).toString().replace(/^http/i,"ws");return t$(r)}let t=e.replace(/^http/i,"ws");return t$(t)}catch{return tj}}();if(!e)return;let t=null,r=!1,n=null,o={},a={},i=null,l=()=>{if(i=null,r)return;let e={};for(let t of Object.keys(o)){let r=o[t];r?.length&&(e[t]=r,o[t]=[])}let t={};for(let e of Object.keys(a)){let r=a[e];r&&(t[e]=r,a[e]=0)}if((Object.keys(e).length||Object.keys(t).length)&&(Object.keys(t).length&&B.current.addDeltas(t),Object.keys(e).length)){let t=O.current,r=t,n=!1;for(let[o,a]of Object.entries(e)){let e=r[o],i=e?.messages??[],l=new Set(i.map(e=>e.id)),s=[];for(let e of a)l.has(e.id)||(l.add(e.id),s.push(e));if(!s.length)continue;r===t&&(r={...t});let c=o===tH.current,u=[...i,...s],d=c?2e3:400,p=u.length>d&&(!c||te.current),f=p?u.slice(-d):u;if(r[o]={messages:f,hasMore:!!p||(e?.hasMore??!0)},c&&(n=!0,p)){let e=u.length-f.length,t=ta.current[o]??-1;ta.current[o]=Math.max(-1,t-e),to.current=Math.max(0,f.length-Math.min(s.length,f.length))}}r!==t&&(O.current=r,n&&z(e=>e+1));let o=ei.current.trim(),a=ey.current;if(o){let t=e[tH.current];if(t?.length){let e=t.filter(e=>tP(e,o));e.length&&ea(t=>{if(!t)return e;let r=new Set(t.map(e=>e.id)),n=[];for(let t of e)r.has(t.id)||(r.add(t.id),n.push(t));return n.length?[...t,...n]:t})}}else if(a){let t=e[tH.current];if(t?.length){let e=t.filter(e=>tP(e,a));e.length&&eu(t=>{if(!t)return e;let r=new Set(t.map(e=>e.id)),n=[];for(let t of e)r.has(t.id)||(r.add(t.id),n.push(t));return n.length?[...t,...n]:t})}}}},s=()=>{r||((t=new WebSocket(e)).onmessage=e=>{try{let{botId:t,id:n,message:s,exchange:c,symbol:u,marketType:d,createdAt:p}=JSON.parse(e.data),f=function(e,t){if(e===tC)return"fr";if("duyuru"===e){let e=null!=t?String(t).trim().toLowerCase():"";return e&&"all"!==e&&"bybit"===(0,eJ.normalizeExchange)(e)?"duyuru-bybit":"duyuru"}return e}(t,c);if(!f||!tk.has(f))return;let m=tx.find(e=>e.id===f||e.subIds?.some(e=>e.id===f));if(m&&(!ti(m,w.current)||!tl(m,S.current)))return;let h=null!=c?String(c).trim().toLowerCase():null;if(null!=h&&"all"!==h&&(0,eJ.normalizeExchange)(h)!==w.current)return;let g=null!=d?String(d).trim().toLowerCase():null,y=null==g||""===g?"futures":g;if("all"!==y&&y!==S.current||!function(e,t,r){let n=e7(t);if(null==n)return!0;let o=function(e,t){if("string"==typeof e&&e.trim())return e.trim().replace(/\.P$/i,"");if("string"!=typeof t||!t.trim())return null;let r=e9(t);if(r)return r;let n=t.match(/#([\p{L}\p{N}]+)/u);return n?.[1]?n[1].replace(/\.P$/i,""):null}(e,r);if(null==o)return!0;let a=o.toUpperCase();for(let e of e3)if(a.endsWith(e))return n.includes(e);for(let e of[...n].sort((e,t)=>t.length-e.length))if(a.endsWith(e))return!0;return!1}(u,k.current,"string"==typeof s?s:null))return;let b=n??`ws-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,x=`${f}:${b}`;if(tF.current!==f&&!e6.current.has(x)){for(e6.current.add(x);e6.current.size>2e3;){let e=e6.current.values().next().value;if("string"!=typeof e)break;e6.current.delete(e)}a[f]=(a[f]??0)+1}let v={id:b,content:"string"==typeof s?s:"",exchange:c,symbol:e5(u),marketType:d,timestamp:p?new Date(p).getTime():Date.now()},j=ts(f,w.current,S.current,k.current);o[j]||(o[j]=[]),o[j].push(v),r||null!=i||(i=window.setTimeout(l,200))}catch{}},t.onclose=()=>{t=null,r||null!=n||(n=window.setTimeout(()=>{n=null,s()},3e3))})};return s(),()=>{r=!0,null!=i&&window.clearTimeout(i),null!=n&&window.clearTimeout(n);let e=t;t=null,e&&(e.onmessage=null,e.onclose=null,e.close())}},[]);let t4=O.current[tB],t6=t4?.messages??tf,t3=t4?.hasMore??!1,t8=A===tB,t5=(0,r.useMemo)(()=>G.trim()?eo??[]:tY?ec??[]:t6,[t6,G,eo,tY,ec]),t9=G.trim()?eo?.length??0:tY?ec?.length??0:t6.length,t7=(0,r.useMemo)(()=>{let e=[],t="",r=[];for(let n of t5){let o=tN((n.timestamp/1e3+tq)*1e3);o!==t&&(r.length&&e.push({dateKey:t,dateLabel:tE(r[0].timestamp,tq),messages:r}),t=o,r=[]),r.push(n)}return r.length&&e.push({dateKey:t,dateLabel:tE(r[0].timestamp,tq),messages:r}),e},[t5,tq]),re=(0,r.useMemo)(()=>{let e=[],t=0;for(let r of t7)for(let n of(e.push({type:"divider",dateKey:r.dateKey,dateLabel:r.dateLabel}),r.messages))e.push({type:"msg",msg:n,idx:t++});return e},[t7]),rt=(0,r.useRef)(re);rt.current=re;let rr=(0,r.useCallback)(()=>eF.current,[]),rn=(0,r.useCallback)(e=>re[e]?.type==="divider"?46:96,[re]),ro=(0,r.useCallback)(e=>{let t=re[e];return t?"divider"===t.type?`d-${t.dateKey}`:`m-${t.msg.id}`:String(e)},[re]),ra=function({useFlushSync:e=!0,...t}){let n=r.useReducer(()=>({}),{})[1],o={...t,onChange:(r,o)=>{var a;e&&o?(0,W.flushSync)(n):n(),null==(a=t.onChange)||a.call(t,r,o)}},[a]=r.useState(()=>new eH(o));return a.setOptions(o),eU(()=>a._didMount(),[]),eU(()=>a._willUpdate()),a}({observeElementRect:ez,observeElementOffset:eL,scrollToFn:eB,...{count:re.length,getScrollElement:rr,estimateSize:rn,overscan:4,getItemKey:ro}}),ri=(0,r.useRef)(ra);ri.current=ra;let rl=(0,r.useCallback)(()=>{let e=eF.current,t=ri.current,r=rt.current,n=tF.current,o=tH.current;if(!r.length){_(!1),eO(e=>null==e.label&&null==e.hiddenDividerDateKey?e:{label:null,hiddenDividerDateKey:null});return}if(!e||!n)return;let{scrollTop:a,clientHeight:i,scrollHeight:l}=e,s=t.getVirtualItems(),c=function(e,t,r){let n=e+8,o=t.find(e=>e.end>n);if(!o)return{label:null,hiddenDividerDateKey:null};let a=o.index,i=r[a];if(i?.type==="divider"&&o.start>=e&&i?.type==="divider")return{label:i.dateLabel,hiddenDividerDateKey:i.dateKey};let l=a;for(;l>=0;){let e=r[l];if(e?.type==="divider")return{label:e.dateLabel,hiddenDividerDateKey:null};l--}return{label:null,hiddenDividerDateKey:null}}(a,s,r);eO(e=>{let t=c.label??e.label;return e.label===t&&e.hiddenDividerDateKey===c.hiddenDividerDateKey?e:{label:t,hiddenDividerDateKey:c.hiddenDividerDateKey}});let u=a+i>=l-50;_(a+i+240<l),te.current=u;let d=O.current[o]?.messages?.length??0;if(u){ta.current[o]=d-1,B.current.clear(n),U(0);return}let p=function(e,t,r,n){let o=-1,a=r+n;for(let n of e){if(n.end<=r||n.start>=a)continue;let e=t[n.index];e?.type==="msg"&&(o=Math.max(o,e.idx))}return o}(s,r,a,i);if(p<0)return;let f=ta.current[o]??-1;ta.current[o]=Math.max(f,p),U(Math.max(0,d-1-ta.current[o]))},[]),rs=(0,r.useCallback)(()=>{null==e8.current&&(e8.current=requestAnimationFrame(()=>{e8.current=null,rl()}))},[rl]),rc=(0,r.useCallback)(()=>{let e=eF.current;e&&e.scrollTo({behavior:"smooth",left:0,top:e.scrollHeight})},[]);(0,r.useLayoutEffect)(()=>{if((!G.trim()||!Z)&&(!tY||!ed)){if(G.trim()&&!Z||tY&&!ed){let e=rt.current;if(e.length)ri.current.scrollToIndex(e.length-1,{align:"end"});else{let e=eF.current;e&&(e.scrollTop=e.scrollHeight)}rs();return}if(eE.current||ej.current){eE.current=!1,ej.current=!1;let e=rt.current;if(e.length)ri.current.scrollToIndex(e.length-1,{align:"end"});else{let e=eF.current;e&&(e.scrollTop=e.scrollHeight)}rs()}}},[G,Z,tY,ed,rs]);let ru=(0,r.useMemo)(()=>({messageActions:a.messageActions,messageActionButton:a.messageActionButton,messageBubble:a.messageBubble,messageLayout:a.messageLayout,messageRow:a.messageRow,symbolLinksWrap:a.symbolLinksWrap,messageExchangeIcon:a.messageExchangeIcon,messageTime:a.messageTime}),[a.messageActionButton,a.messageActions,a.messageBubble,a.messageExchangeIcon,a.messageLayout,a.messageRow,a.messageTime,a.symbolLinksWrap]),rd=(0,r.useCallback)(e=>{eN(!1),X(e),Q(e.trim()),q(!0),requestAnimationFrame(()=>eA.current?.focus())},[]),rp=(0,r.useCallback)(()=>{X(""),Q(""),ea(null),J(!1),et(!1),en(!1)},[]),rf=(0,r.useCallback)(e=>tl(e,b)?null:o(e.market_types.includes("FUTURES")?"marketTypeNotice.futuresOnly":"marketTypeNotice.spotOnly",{bot:e.botName}),[b,o]),rm=(0,r.useMemo)(()=>tA?rf(tA):null,[tA,rf]),rh=tA?.market_types.includes("FUTURES")?"futures":"spot",rg=(0,e1.useMarketTypeSwitch)(),ry=(0,r.useCallback)(()=>rg(rh),[rg,rh]),rb=(0,r.useCallback)(e=>{let t=eF.current;t&&C!==e&&(eK.current[tB]=t.scrollTop),T(e),(G||eC||tY)&&(eN(!1),es({}),rp())},[C,tB,G,tY,rp,eC]),rx=(0,r.useCallback)(e=>{es(t=>{let r=!t[e.id];return r||(ej.current=!0),{...t,[e.id]:r}}),q(!1),eN(!1),rp()},[rp]),rv=(0,r.useCallback)(()=>{if(eC){eN(!1),eE.current=!0,rp();return}tV?(eN(!0),q(!1),es({}),X(tV),Q(tV)):eY.message.warning(o("noSymbolSelected"))},[eC,tV,rp,o]);(0,r.useEffect)(()=>{eC&&tV&&(X(tV),Q(tV))},[eC,tV]);let rw=(0,r.useCallback)(()=>{eN(!1),es({}),Q(K.trim())},[K]),rS=(0,r.useCallback)(()=>{eE.current=!0,q(!1),eN(!1),rp()},[rp]);(0,r.useEffect)(()=>{$(function(){try{let e=localStorage.getItem(tv);if(!e)return[...tx];let t=JSON.parse(e);if(!Array.isArray(t)||0===t.length)return[...tx];let r=new Map(tx.map(e=>[e.id,e])),n=[];for(let e of t){let t=r.get(e);t&&n.push(t)}for(let e of tx)n.includes(e)||n.push(e);return n.length?n:[...tx]}catch{return[...tx]}}());{let e=window.localStorage.getItem(tS);e&&tk.has(e)&&eD(e)}let e=requestAnimationFrame(()=>P(!0));return()=>cancelAnimationFrame(e)},[]),(0,r.useEffect)(()=>{to.current=(O.current[tB]?.messages??[]).length;let e=requestAnimationFrame(()=>{let e=eF.current;if(!e||!tL)return;let t=eK.current[tB];e.scrollTop="number"==typeof t?t:e.scrollHeight,rs()});return()=>cancelAnimationFrame(e)},[tL,tB,rs]),(0,r.useEffect)(()=>{if(t9>to.current&&te.current){let e=requestAnimationFrame(()=>{let e=rt.current;e.length&&ri.current.scrollToIndex(e.length-1,{align:"end"})});return to.current=t9,()=>cancelAnimationFrame(e)}to.current=t9},[tL,t9]),(0,r.useLayoutEffect)(()=>{let e=td.current;if(!e||e.channelId!==tB||e.prependCount<=0)return;let t=eF.current;if(!t){td.current=null;return}let r=t.scrollHeight-e.scrollHeight;t.scrollTop=e.scrollTop+r;let n=ta.current[tB]??-1;ta.current[tB]=n+e.prependCount;let o=t6.length;U(Math.max(0,o-1-ta.current[tB])),to.current=o,td.current=null,ri.current.measure(),rs()},[tB,t6.length,rs]),(0,r.useLayoutEffect)(()=>{let e=tm.current;if(!e||e.prependCount<=0)return;let t=eF.current;if(!t){tm.current=null;return}let r=t.scrollHeight-e.scrollHeight;t.scrollTop=e.scrollTop+r,tm.current=null,ri.current.measure(),rs()},[eo,rs]),(0,r.useLayoutEffect)(()=>{let e=ev.current;if(!e||e.prependCount<=0)return;let t=eF.current;if(!t){ev.current=null;return}let r=t.scrollHeight-e.scrollHeight;t.scrollTop=e.scrollTop+r,ev.current=null,ri.current.measure(),rs()},[ec,rs]),(0,r.useEffect)(()=>{tL&&0!==t9&&rs()},[tL,t9,rs]),(0,r.useEffect)(()=>()=>{null!=e8.current&&cancelAnimationFrame(e8.current)},[]);let rk=(0,r.useMemo)(()=>({activeIndicator:a.activeIndicator,botIcon:a.botIcon,botIconActive:a.botIconActive,botIconDragging:a.botIconDragging,botIconDropTarget:a.botIconDropTarget,botIconUnavailable:a.botIconUnavailable,unreadBadge:a.unreadBadge}),[a.activeIndicator,a.botIcon,a.botIconActive,a.botIconDragging,a.botIconDropTarget,a.botIconUnavailable,a.unreadBadge]);return(0,t.jsxs)("div",{className:a.container,children:[(0,t.jsxs)("div",{className:a.iconSidebarWrapper,children:[(0,t.jsx)("div",{ref:eW,className:a.iconSidebar,onScroll:tG,children:tb.map(e=>{let r=C===e.id,n=rf(e);return(0,t.jsx)(tp,{channel:e,active:r,dragging:M===e.id,dropTarget:E===e.id,layoutEnabled:D,unavailable:null!==n,tooltip:n??e.botName,activeUnreadCount:r?H:0,unreadStore:B.current,styles:rk,onSelect:rb,onDragStart:tQ,onDragOver:tZ,onDragLeave:tJ,onDrop:t0,onDragEnd:t1},e.id)})}),eV&&(0,t.jsx)("div",{className:a.sidebarBottomHint,"aria-hidden":!0,onClick:()=>{let e=eW.current;e&&e.scrollTo({top:e.scrollHeight,behavior:"smooth"})},role:"button",children:(0,t.jsx)(ek.ChevronDown,{size:20})})]}),(0,t.jsxs)("div",{className:a.chatArea,children:[(0,t.jsxs)("div",{className:a.channelHeader,children:[(0,t.jsx)("span",{className:a.channelHeaderIcon,children:(0,t.jsx)(tc,{avatar:tA.botAvatar,alt:tA.botName,size:40})}),(0,t.jsxs)("div",{className:a.channelHeaderInfo,children:[(0,t.jsx)("span",{className:a.channelName,children:tA.botName}),tA.description&&(0,t.jsx)("span",{className:a.channelDesc,children:o(tA.description)})]}),tA.subIds?.length?(0,t.jsx)("div",{className:a.subTypeBtns,children:tA.subIds.map(e=>(0,t.jsx)("button",{type:"button",title:e.botName,className:i(a.subTypeBtn,e.isToggle?el[e.id]&&a.subTypeBtnActive:eI===e.id&&a.subTypeBtnActive),onClick:()=>{e.isToggle?rx(e):eD(e.id)},children:e.hint.slice(0,2)},e.id))}):null,V?(0,t.jsxs)("div",{className:a.searchInputWrapper,children:[(0,t.jsx)("input",{ref:eA,className:a.searchInput,placeholder:o("searchPlaceholder"),value:K,onChange:e=>X(e.target.value),onKeyDown:e=>{"Enter"===e.key&&rw(),"Escape"===e.key&&rS()},autoFocus:!0}),G.trim()&&(0,t.jsx)("span",{className:a.searchCount,children:Z?"…":t5.length}),(0,t.jsx)("div",{className:a.searchClear,onClick:rS,children:(0,t.jsx)(eb.X,{size:14})})]}):(0,t.jsx)("div",{className:a.searchBtn,title:o("search"),onClick:()=>{q(!0),requestAnimationFrame(()=>eA.current?.focus())},children:(0,t.jsx)(eM.Search,{size:15})}),(0,t.jsx)("div",{className:i(a.searchBtn,eC&&a.searchBtnActive),title:eC&&tV?o("filterRemove",{symbol:tV}):tV?o("showOnlySymbolMessages",{symbol:tV}):o("noSymbolSelected"),onClick:rv,children:(0,t.jsx)(e$.Crosshair,{size:15})}),e&&(0,t.jsx)("div",{className:a.headerCloseBtn,onClick:e,title:o("minimize"),children:(0,t.jsx)(ek.ChevronDown,{size:16})})]}),(0,t.jsxs)("div",{className:a.messagesAreaWrapper,children:[(0,t.jsxs)("div",{ref:eF,className:a.messagesArea,onScroll:()=>{let e=eF.current;e&&(e.scrollTop<=80&&(()=>{if(G.trim()){if(!eo?.length||!er||ee||Z||ty.current)return;let e=eo[0];if(!e)return;let t=new Date(e.timestamp).toISOString();ty.current=!0,et(!0),tO(tL,G.trim(),y,b,v,t).then(e=>{if(et(!1),!e?.messages.length)return void en(!1);let t=eF.current;t&&(tm.current={scrollHeight:t.scrollHeight,scrollTop:t.scrollTop,prependCount:e.messages.length}),ea(t=>t?[...e.messages,...t]:e.messages),en(e.hasMore)}).catch(()=>{et(!1),en(!1)}).finally(()=>{ty.current=!1});return}if(tY){if(!ec?.length||!ef||eh||ed||ex.current)return;let e=ec[0];if(!e)return;let t=new Date(e.timestamp).toISOString();ex.current=!0,eg(!0),tO(tL,tY,y,b,v,t).then(e=>{if(eg(!1),!e?.messages.length)return void em(!1);let t=eF.current;t&&(ev.current={scrollHeight:t.scrollHeight,scrollTop:t.scrollTop,prependCount:e.messages.length}),eu(t=>t?[...e.messages,...t]:e.messages),em(e.hasMore)}).catch(()=>{eg(!1),em(!1)}).finally(()=>{ex.current=!1});return}let e=O.current[tB];if(!e?.hasMore||L||A||th.current)return;let t=e.messages[0];if(!t)return;let r=new Date(t.timestamp).toISOString();th.current=!0,F(!0),t2(tL,r).then(e=>{if(F(!1),e?.messages.length){let t=eF.current;t&&(td.current={scrollHeight:t.scrollHeight,scrollTop:t.scrollTop,prependCount:e.messages.length,channelId:tB});let r=O.current[tB];r&&tW(tB,{messages:[...e.messages,...r.messages],hasMore:e.hasMore})}}).finally(()=>{th.current=!1})})(),rs())},"data-bot-chat-messages":!0,children:[eP.label&&(0,t.jsx)("div",{className:a.stickyDateBadge,children:(0,t.jsx)("span",{className:a.stickyDateBadgeInner,children:eP.label})}),!G.trim()&&!tY&&t3&&t6.length>0&&L&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)(e_.Spin,{size:"small"})}),G.trim()&&er&&(eo?.length??0)>0&&ee&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)(e_.Spin,{size:"small"})}),tY&&ef&&(ec?.length??0)>0&&eh&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)(e_.Spin,{size:"small"})}),!G.trim()&&!tY&&!t3&&t6.length>0&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)("span",{style:{fontSize:12,color:"var(--colorTextTertiary)"},children:o("noMoreMessages")})}),G.trim()&&!er&&(eo?.length??0)>0&&!ee&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)("span",{style:{fontSize:12,color:"var(--colorTextTertiary)"},children:o("noMoreMessages")})}),tY&&!ef&&(ec?.length??0)>0&&!eh&&(0,t.jsx)("div",{style:{textAlign:"center",padding:8},children:(0,t.jsx)("span",{style:{fontSize:12,color:"var(--colorTextTertiary)"},children:o("noMoreMessages")})}),tR?(0,t.jsxs)("div",{className:a.emptyState,children:[(0,t.jsx)(p,{size:42}),(0,t.jsx)("span",{className:a.marketNoticeText,children:rm}),(0,t.jsxs)("button",{type:"button",className:a.marketNoticeBtn,onClick:ry,children:["spot"===rh?o("marketTypeNotice.goToSpot"):o("marketTypeNotice.goToFutures"),(0,t.jsx)(eS.ArrowRight,{size:14})]})]}):t8&&0===t6.length&&!tY?(0,t.jsxs)("div",{className:a.emptyState,children:[(0,t.jsx)(p,{size:42}),(0,t.jsx)("span",{children:o("empty.loading")})]}):0===t5.length?(0,t.jsx)("div",{className:a.emptyState,children:G.trim()?Z?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(e_.Spin,{size:"small"}),(0,t.jsx)("span",{children:o("empty.searching")})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(eM.Search,{size:42}),(0,t.jsx)("span",{children:o("empty.noResults")})]}):tY?ed?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(e_.Spin,{size:"small"}),(0,t.jsx)("span",{children:o("empty.filtering")})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(p,{size:42}),(0,t.jsx)("span",{children:o("empty.noMatchingSignals")})]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(p,{size:42}),(0,t.jsx)("span",{children:o("empty.noSignalsYet")})]})}):(0,t.jsx)("div",{className:a.messageList,style:{height:ra.getTotalSize(),width:"100%",position:"relative"},children:ra.getVirtualItems().map(e=>{let r=re[e.index];return r?"divider"===r.type?(0,t.jsx)("div",{"data-index":e.index,"data-bot-chat-vrow":"","data-bot-chat-vrow-type":"divider",ref:ra.measureElement,className:a.dateGroup,style:{position:"absolute",top:0,left:0,width:"100%",transform:`translateY(${e.start}px)`},children:(0,t.jsx)("div",{className:a.dateDivider,children:(0,t.jsx)("span",{className:i(a.dateDividerLabel,r.dateKey===eP.hiddenDividerDateKey&&a.dateDividerLabelHidden),children:r.dateLabel})})},e.key):(0,t.jsx)("div",{"data-index":e.index,"data-bot-chat-vrow":"","data-bot-chat-vrow-type":"message","data-message-index":r.idx,ref:ra.measureElement,style:{position:"absolute",top:0,left:0,width:"100%",transform:`translateY(${e.start}px)`},children:(0,t.jsx)(tg,{msg:r.msg,rowStyles:ru,navigateToSymbol:f,formatMessageTime:tX,tzLabel:tK,onOpenSearchWithSymbol:rd,activeExchange:y,activeMarketType:b,onPrefetchMouseEnter:m,onPrefetchMouseDown:h,onPrefetchMouseLeave:g})},e.key):null})}),(0,t.jsx)("div",{ref:eR})]}),t6.length>0&&(0,t.jsx)("button",{type:"button",className:a.backBottomButton,"data-visible":Y,"aria-label":tr.default.t("watchlist:scrollToBottom"),title:tr.default.t("watchlist:scrollToBottom"),onClick:rc,children:(0,t.jsx)(eT,{size:16,"aria-hidden":!0})})]})]})]})},tA=(0,r.memo)(function(e){let r=to(),{t:o}=(0,n.useTranslation)("botChat");return(0,t.jsx)(tz,{...e,styleBundle:r,t:o})});tA.displayName="BotChat";var tR=e.i(822209),tL=e.i(515489);let tF=(0,l.default)("file-text",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]),tB=(0,l.default)("message-circle",[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]]),tH=(0,l.default)("message-square-quote",[["path",{d:"M14 14a2 2 0 0 0 2-2V8h-2",key:"1r06pg"}],["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}],["path",{d:"M8 14a2 2 0 0 0 2-2V8H8",key:"1jzu5j"}]]),tW=(0,l.default)("megaphone",[["path",{d:"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",key:"q8bfy3"}],["path",{d:"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14",key:"1853fq"}],["path",{d:"M8 6v8",key:"15ugcq"}]]),tU=(0,l.default)("code",[["path",{d:"m16 18 6-6-6-6",key:"eg8j8"}],["path",{d:"m8 6-6 6 6 6",key:"ppft3o"}]]);var tY=e.i(329221),t_=e.i(781521),tV=e.i(407332),tq=e.i(833997);let tK=(0,o.createStyles)(({css:e,token:t})=>({wrapper:e`
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${t.colorBorderSecondary};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,row:e`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 32px;
  `,rowLabel:e`
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${t.colorTextTertiary};
    font-weight: 600;
    flex-shrink: 0;
    width: 92px;
    white-space: nowrap;
  `,pillsArea:e`
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
  `,pillsScroll:e`
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-behavior: smooth;
    padding: 2px 0;
    &::-webkit-scrollbar {
      display: none;
    }
  `,edgeScroll:e`
    position: absolute;
    top: 0;
    bottom: 0;
    width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    border: none;
    padding: 0;
    cursor: pointer;
    color: ${t.colorTextTertiary};
    background: transparent;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
    &:hover {
      color: ${t.colorText};
    }
  `,edgeScrollVisible:e`
    opacity: 1;
    pointer-events: auto;
  `,edgeScrollLeft:e`
    left: 0;
    background: linear-gradient(
      to right,
      ${t.colorBgContainer} 45%,
      transparent 100%
    );
  `,edgeScrollRight:e`
    right: 0;
    background: linear-gradient(
      to left,
      ${t.colorBgContainer} 45%,
      transparent 100%
    );
  `,pill:e`
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${t.colorFillTertiary};
    border: 1px solid ${t.colorBorderSecondary};
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: ${t.colorTextSecondary};
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease,
      border-color 0.15s ease;
    &:hover {
      background: ${t.colorFillSecondary};
      color: ${t.colorText};
      border-color: ${t.colorBorder};
      transform: translateY(-1px);
    }
    &:active {
      transform: translateY(0);
    }
  `,pillImg:e`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: contain;
    display: block;
  `,pillInitial:e`
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    color: ${t.colorTextSecondary};
    user-select: none;
  `,ucidPill:e`
    flex-shrink: 0;
    height: 28px;
    padding: 0 10px;
    border-radius: 14px;
    background: ${t.colorFillTertiary};
    border: 1px solid ${t.colorBorderSecondary};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${t.colorText};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    &:hover {
      background: ${t.colorFillSecondary};
      border-color: ${t.colorBorder};
    }
  `,ucidIcon:e`
    color: ${t.colorTextTertiary};
    display: inline-flex;
  `,contractTooltipTitle:e`
    font-weight: 700;
    font-size: 12px;
  `,contractTooltipAddress:e`
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    font-size: 11px;
    word-break: break-all;
    opacity: 0.85;
    margin-top: 2px;
  `}));async function tX(e){try{if(navigator?.clipboard?.writeText)return await navigator.clipboard.writeText(e),!0;let t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select();let r=document.execCommand("copy");return document.body.removeChild(t),r}catch{return!1}}function tG({url:e,icon:r,className:n}){return(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:function(e){try{return new URL(e).host.replace(/^www\./,"")}catch{return e}}(e),children:(0,t.jsx)("a",{className:n,href:(0,te.withVisiveroUtm)(e),target:"_blank",rel:"noopener noreferrer",children:r})})}let tQ=(0,r.memo)(function({label:e,children:n,hasAny:o,styleBundle:a,scrollLeftLabel:i,scrollRightLabel:l}){let{styles:s,cx:c}=a,d=(0,r.useRef)(null),[p,f]=(0,r.useState)(!1),[m,h]=(0,r.useState)(!1),g=(0,r.useCallback)(()=>{let e=d.current;if(!e)return;let t=e.scrollWidth-e.clientWidth;f(e.scrollLeft>2),h(t-e.scrollLeft>2)},[]);(0,r.useEffect)(()=>{if(!o)return;g();let e=d.current;if(!e)return;e.addEventListener("scroll",g,{passive:!0});let t=new ResizeObserver(g);return t.observe(e),Array.from(e.children).forEach(e=>t.observe(e)),()=>{e.removeEventListener("scroll",g),t.disconnect()}},[o,g,n]),(0,r.useEffect)(()=>{if(!o)return;let e=d.current;if(!e)return;let t=t=>{if(e.scrollWidth<=e.clientWidth)return;let r=e.scrollWidth-e.clientWidth,n=Math.abs(t.deltaX)>Math.abs(t.deltaY)?t.deltaX:t.deltaY;if(0===n)return;let o=e.scrollLeft+n;n>0&&e.scrollLeft>=r-.5||n<0&&e.scrollLeft<=.5||(t.preventDefault(),e.scrollLeft=Math.min(r,Math.max(0,o)))};return e.addEventListener("wheel",t,{passive:!1}),()=>e.removeEventListener("wheel",t)},[o,n]);let y=(0,r.useCallback)(e=>{let t=d.current;if(!t)return;let r=Math.min(140,Math.max(80,.55*t.clientWidth));t.scrollBy({left:e*r,behavior:"smooth"})},[]);return o?(0,t.jsxs)("div",{className:s.row,children:[(0,t.jsx)("div",{className:s.rowLabel,children:e}),(0,t.jsxs)("div",{className:s.pillsArea,children:[(0,t.jsx)("div",{ref:d,className:s.pillsScroll,children:n}),(0,t.jsx)("button",{type:"button",className:c(s.edgeScroll,s.edgeScrollLeft,p&&s.edgeScrollVisible),"aria-label":i,onClick:()=>y(-1),children:(0,t.jsx)(tY.ChevronLeft,{size:14})}),(0,t.jsx)("button",{type:"button",className:c(s.edgeScroll,s.edgeScrollRight,m&&s.edgeScrollVisible),"aria-label":l,onClick:()=>y(1),children:(0,t.jsx)(u.ChevronRight,{size:14})})]})]}):null});function tZ({entry:e,className:n,imgClassName:o,initialClassName:a,tooltipTitleCls:l,tooltipAddrCls:s,loadLogos:c,copiedSuccessfullyLabel:u,copyFailedLabel:d}){let p=function(e){let t=Object.keys(e);if(0===t.length)return null;let r=t[0],n=e[r];return n&&"object"==typeof n?{symbolKey:r,data:n}:null}(e),f=`${c?"1":"0"}:${p?.symbolKey??""}`,[m,h]=(0,r.useState)(null),[g,y]=(0,r.useState)(null),b=m===f,x=g===f;if(!p)return null;let{symbolKey:v,data:w}=p,{platform_id:S,platform_name:k,address:j}=w,$=(v||k||"?").replace(/[^a-zA-Z0-9]/g,"").charAt(0).toUpperCase()||"?",C=S?`https://s2.coinmarketcap.com/static/img/coins/64x64/${S}.png`:"",T=S&&Number(S)>0?(0,tq.getSymbolLogoUrl)(Number(S))??"":"",M=async()=>{await tX(j)?eY.message.success(u):eY.message.error(d)},N=(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:l,children:k}),(0,t.jsx)("div",{className:s,children:j})]});return(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:N,children:(0,t.jsx)("div",{role:"button",tabIndex:0,className:n,onClick:M,onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),M())},children:c?x&&T&&!b?(0,t.jsx)("img",{src:T,alt:k,className:o,loading:"lazy",decoding:"async",onError:()=>h(f)}):!b&&C?(0,t.jsx)("img",{src:C,alt:k,className:o,loading:"lazy",decoding:"async",onError:()=>{T?y(f):h(f)}}):!b&&T?(0,t.jsx)("img",{src:T,alt:k,className:o,loading:"lazy",decoding:"async",onError:()=>h(f)}):(0,t.jsx)("span",{className:a,"aria-hidden":!0,children:$}):(0,t.jsx)("span",{className:a,"aria-hidden":!0,children:$})})})}let tJ=(0,r.memo)(function({stats:e,loadContractLogos:r=!1}){let o=tK(),{styles:a}=o,{t:l}=(0,n.useTranslation)("workspace"),s=e.urls??{},u=Array.isArray(e.contractAddresses)?e.contractAddresses:[],d=e.ucid,p=[...(s?.website??[]).map(e=>({url:e,icon:(0,t.jsx)(tL.Globe,{size:14})})),...(s?.technical_doc??[]).map(e=>({url:e,icon:(0,t.jsx)(tF,{size:14})}))],f=[...(s?.chat??[]).map(e=>({url:e,icon:(0,t.jsx)(tB,{size:14})})),...(s?.twitter??[]).map(e=>({url:e,icon:(0,t.jsx)(t_.FontAwesomeIcon,{icon:tV.faXTwitter,style:{fontSize:13}})})),...(s?.reddit??[]).map(e=>({url:e,icon:(0,t.jsx)(t_.FontAwesomeIcon,{icon:tV.faReddit,style:{fontSize:14}})})),...(s?.facebook??[]).map(e=>({url:e,icon:(0,t.jsx)(t_.FontAwesomeIcon,{icon:tV.faFacebook,style:{fontSize:14}})})),...(s?.message_board??[]).map(e=>({url:e,icon:(0,t.jsx)(tH,{size:14})}))],m=[...(s?.source_code??[]).map(e=>({url:e,icon:(0,t.jsx)(tU,{size:14})})),...(s?.announcement??[]).map(e=>({url:e,icon:(0,t.jsx)(tW,{size:14})})),...(s?.explorer??[]).map(e=>({url:e,icon:(0,t.jsx)(c,{size:14})}))],h=u.length>0,g=null!=d&&d>0;if(!(p.length>0||f.length>0||m.length>0||h||g))return null;let y=async()=>{null==d||(await tX(String(d))?eY.message.success(l("symbolLinks.copiedSuccessfully")):eY.message.error(l("symbolLinks.copyFailed")))};return(0,t.jsxs)("div",{className:a.wrapper,children:[(0,t.jsx)(tQ,{label:l("symbolLinks.website"),hasAny:p.length>0,styleBundle:o,scrollLeftLabel:l("symbolLinks.scrollLeft"),scrollRightLabel:l("symbolLinks.scrollRight"),children:p.map((e,r)=>(0,t.jsx)(tG,{url:e.url,icon:e.icon,className:a.pill},`w-${r}-${e.url}`))}),(0,t.jsx)(tQ,{label:l("symbolLinks.socials"),hasAny:f.length>0,styleBundle:o,scrollLeftLabel:l("symbolLinks.scrollLeft"),scrollRightLabel:l("symbolLinks.scrollRight"),children:f.map((e,r)=>(0,t.jsx)(tG,{url:e.url,icon:e.icon,className:a.pill},`s-${r}-${e.url}`))}),(0,t.jsx)(tQ,{label:l("symbolLinks.explore"),hasAny:m.length>0,styleBundle:o,scrollLeftLabel:l("symbolLinks.scrollLeft"),scrollRightLabel:l("symbolLinks.scrollRight"),children:m.map((e,r)=>(0,t.jsx)(tG,{url:e.url,icon:e.icon,className:a.pill},`e-${r}-${e.url}`))}),(0,t.jsx)(tQ,{label:l("symbolLinks.contracts"),hasAny:h,styleBundle:o,scrollLeftLabel:l("symbolLinks.scrollLeft"),scrollRightLabel:l("symbolLinks.scrollRight"),children:u.map((e,n)=>(0,t.jsx)(tZ,{entry:e,className:a.pill,imgClassName:a.pillImg,initialClassName:a.pillInitial,tooltipTitleCls:a.contractTooltipTitle,tooltipAddrCls:a.contractTooltipAddress,loadLogos:r,copiedSuccessfullyLabel:l("symbolLinks.copiedSuccessfully"),copyFailedLabel:l("symbolLinks.copyFailed")},`c-${n}`))}),(0,t.jsx)(tQ,{label:l("symbolLinks.ucid"),hasAny:g,styleBundle:o,scrollLeftLabel:l("symbolLinks.scrollLeft"),scrollRightLabel:l("symbolLinks.scrollRight"),children:(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:l("symbolLinks.copyUcid"),children:(0,t.jsxs)("div",{role:"button",tabIndex:0,className:a.ucidPill,onClick:y,onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),y())},children:[(0,t.jsx)("span",{children:d}),(0,t.jsx)("span",{className:a.ucidIcon,children:(0,t.jsx)(ej.Copy,{size:12})})]})})})]})}),t0=(0,o.createStyles)(({css:e,token:t})=>({container:e`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: ${t.colorBgContainer};
  `,header:e`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${t.colorBorderSecondary};
    flex-shrink: 0;
    min-height: 38px;
  `,headerTitle:e`
    font-size: 13px;
    font-weight: 600;
    color: ${t.colorText};
    flex: 1;
  `,closeBtn:e`
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${t.colorTextSecondary};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
      background: ${t.colorFillTertiary};
      color: ${t.colorText};
    }
  `,content:e`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: ${t.colorBorderSecondary};
      border-radius: 2px;
    }
  `,empty:e`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 120px;
    color: ${t.colorTextTertiary};
    font-size: 12px;
    text-align: center;
    padding: 16px;
  `,symbolBadge:e`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: ${t.colorFillTertiary};
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: ${t.colorText};
  `,symbolIcon:e`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: contain;
  `,grid:e`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  `,card:e`
    padding: 10px 12px;
    background: ${t.colorFillTertiary};
    border-radius: 8px;
    border: 1px solid ${t.colorBorderSecondary};
    text-align: center;
  `,cardFullWidth:e`
    grid-column: 1 / -1;
  `,label:e`
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${t.colorTextTertiary};
    margin-bottom: 2px;
    text-align: center;
  `,value:e`
    font-size: 13px;
    font-weight: 600;
    color: ${t.colorText};
    text-align: center;
  `,valueSmall:e`
    font-size: 11px;
    font-weight: 500;
    color: ${t.colorTextSecondary};
    text-align: center;
  `,supplyRow:e`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
  `,supplyValueBlock:e`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  `,supplyValue:e`
    flex-shrink: 0;
  `,ringWrapper:e`
    flex-shrink: 0;
    line-height: 0;
    display: inline-flex;
    align-items: center;
  `,supplyPerc:e`
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  `,changeUp:e`
    color: ${a.GREEN};
    font-size: 12px;
    font-weight: 600;
  `,changeDown:e`
    color: ${a.RED};
    font-size: 12px;
    font-weight: 600;
  `}));function t1(e){return null==e||Number.isNaN(e)?"—":e>=1e12?`${(e/1e12).toFixed(2)}T`:e>=1e9?`${(e/1e9).toFixed(2)}B`:e>=1e6?`${(e/1e6).toFixed(2)}M`:e>=1e3?`${(e/1e3).toFixed(2)}K`:(0,tt.formatNumber)(e)}function t2(e){return null==e||Number.isNaN(e)?"—":(0,tt.formatNumber)(Math.round(e))}let t4=e=>{let t=parseInt(e.slice(1),16);return[t>>16,t>>8&255,255&t]},t6=(e,t,r)=>Math.round(e+(t-e)*r);function t3(e,t=1){let r,n,o,[i,l,s]=t4(a.RED),[c,u,d]=t4("#305bfc");if(e<=25)[r,n,o]=[i,l,s];else if(e>=100)[r,n,o]=[c,u,d];else{let t=(e-25)/75;r=t6(i,c,t),n=t6(l,u,t),o=t6(s,d,t)}return t>=1?`rgb(${r},${n},${o})`:`rgba(${r},${n},${o},${t})`}let t8=(0,r.memo)(function({onClose:e,isActive:o=!0}){let a,l,s,c,{t:u}=(0,n.useTranslation)("workspace"),{styles:d}=t0(),p=(0,eX.useSelectedSymbol)(),f=(0,eX.useSymbolsWithMainAsset)(),m=(0,r.useMemo)(()=>(0,tR.resolveMainAssetFromWatchlist)(p,f),[p,f]),h=(0,r.useMemo)(()=>(0,tR.resolveUcidFromWatchlist)(p,f),[p,f]),[g,y]=(0,r.useState)(null),[b,x]=(0,r.useState)(!1);return(0,r.useEffect)(()=>{if(!o)return;if(!h){y(null),x(!1);return}let e=(0,tR.peekSymbolStatsCache)(h);if(void 0!==e){y(e),x(!1);return}let t=!1,r=null;x(!0);let n=async(e=0)=>{let o=await (0,tR.loadSymbolStats)(h);if(t)return;if(void 0!==(0,tR.peekSymbolStatsCache)(h)){y(o),x(!1);return}let a=Math.min(15e3,1e3*2**Math.min(e,4));r=window.setTimeout(()=>{r=null,n(e+1)},a)};return n(),()=>{t=!0,null!==r&&window.clearTimeout(r)}},[h,o]),(0,t.jsxs)("div",{className:d.container,children:[(0,t.jsxs)("div",{className:d.header,children:[(0,t.jsx)("span",{className:d.headerTitle,children:u("symbolInfoPanel.title")}),e&&(0,t.jsx)("div",{className:d.closeBtn,onClick:e,title:u("symbolInfoPanel.close"),role:"button",children:(0,t.jsx)(eb.X,{size:16})})]}),(0,t.jsxs)("div",{className:d.content,children:[!m&&(0,t.jsx)("div",{className:d.empty,children:u("symbolInfoPanel.selectSymbol")}),m&&!g&&!b&&(0,t.jsxs)("div",{className:d.empty,children:[(0,t.jsx)("span",{className:d.symbolBadge,children:m}),u("symbolInfoPanel.noStats")]}),m&&b&&(0,t.jsx)("div",{className:d.empty,children:u("symbolInfoPanel.loading")}),m&&g&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:d.grid,children:[(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.marketCap")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`$${t2(g.marketCap)}`,children:(0,t.jsxs)("div",{className:d.value,style:{cursor:"default"},children:["$",t1(g.marketCap),null!=g.marketCapPerc24h&&!Number.isNaN(g.marketCapPerc24h)&&(0,t.jsxs)("span",{className:g.marketCapPerc24h>=0?d.changeUp:d.changeDown,children:[" ",g.marketCapPerc24h>=0?"▴":"▾"," ",g.marketCapPerc24h.toFixed(2),"%"]})]})})]}),(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.volume24h")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`$${t2(g.volume24h)}`,children:(0,t.jsxs)("div",{className:d.value,style:{cursor:"default"},children:["$",t1(g.volume24h),null!=g.volumePerc24h&&!Number.isNaN(g.volumePerc24h)&&(0,t.jsxs)("span",{className:g.volumePerc24h>=0?d.changeUp:d.changeDown,children:[" ",g.volumePerc24h>=0?"▴":"▾"," ",g.volumePerc24h.toFixed(2),"%"]})]})})]}),(0,t.jsxs)("div",{className:`${d.card} ${d.cardFullWidth}`,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.volumeMarketCapRatio")}),(0,t.jsx)("div",{className:d.value,style:{cursor:"default"},children:null!=g.marketCap&&g.marketCap>0&&null!=g.volume24h?`${(Number(g.volume24h)/Number(g.marketCap)*100).toFixed(2)}%`:"—"})]}),(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.circulatingSupply")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`${t2(g.circulatingSupply)} ${g.mainAsset}`,children:(0,t.jsxs)("div",{className:d.supplyRow,style:{cursor:"default"},children:[(0,t.jsxs)("div",{className:d.supplyValueBlock,children:[(0,t.jsxs)("span",{className:`${d.valueSmall} ${d.supplyValue}`,children:[t1(g.circulatingSupply)," ",g.mainAsset]}),null!=g.circulatingSupply&&null!=g.maxSupply&&g.maxSupply>0&&(a=Math.min(100,Math.max(0,g.circulatingSupply/g.maxSupply*100)),s=(l=2*Math.PI*6)*(1-a/100),(0,t.jsx)("span",{className:d.ringWrapper,children:(0,t.jsxs)("svg",{width:18,height:18,viewBox:"0 0 18 18",style:{transform:"rotate(-90deg)"},children:[(0,t.jsx)("circle",{cx:9,cy:9,r:6,fill:"none",stroke:t3(a,.2),strokeWidth:2}),(0,t.jsx)("circle",{cx:9,cy:9,r:6,fill:"none",stroke:t3(a),strokeWidth:2,strokeDasharray:l,strokeDashoffset:s,strokeLinecap:"round",style:{transition:"stroke-dashoffset 0.3s ease, stroke 0.3s ease"}})]})}))]}),null!=g.circulatingSupply&&null!=g.maxSupply&&g.maxSupply>0&&(c=Math.min(100,Math.max(0,g.circulatingSupply/g.maxSupply*100)),(0,t.jsxs)("span",{className:d.supplyPerc,style:{color:t3(c)},children:["%",c.toFixed()]}))]})})]}),(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.maxSupply")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`${t2(g.maxSupply)} ${g.mainAsset}`,children:(0,t.jsxs)("div",{className:d.valueSmall,style:{cursor:"default",minHeight:"1.5em"},children:[t1(g.maxSupply)," ",g.mainAsset]})})]}),(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.totalSupply")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`${t2(g.totalSupply)} ${g.mainAsset}`,children:(0,t.jsxs)("div",{className:d.valueSmall,style:{cursor:"default",minHeight:"1.5em"},children:[t1(g.totalSupply)," ",g.mainAsset]})})]}),(0,t.jsxs)("div",{className:d.card,children:[(0,t.jsx)("div",{className:d.label,children:u("symbolInfoPanel.fullyDilutedMarketCap")}),(0,t.jsx)(i.Tooltip,{mouseEnterDelay:0,mouseLeaveDelay:.1,title:`$${t2(g.fullyDilutedMarketCap)}`,children:(0,t.jsxs)("div",{className:d.valueSmall,style:{cursor:"default",minHeight:"1.5em"},children:["$",t1(g.fullyDilutedMarketCap)]})})]})]}),(0,t.jsx)(tJ,{stats:g,loadContractLogos:o})]})]})]})});e.i(631785);var t5=e.i(223187),t9=e.i(181286),t7=e.i(850948),re=e.i(45436);let rt=(0,l.default)("arrow-up-down",[["path",{d:"m21 16-4 4-4-4",key:"f6ql7i"}],["path",{d:"M17 20V4",key:"1ejh1v"}],["path",{d:"m3 8 4-4 4 4",key:"11wl7u"}],["path",{d:"M7 4v16",key:"1glfcx"}]]);var rr=e.i(773206),rn=e.i(914864);let ro=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        flex-direction: column;
        height: 100%;
    `,tabs:e`
        .ant-tabs-nav {
            margin: 0;
            padding: 0 4px;

            &::before {
                border-bottom: 1px solid ${t.colorBorderSecondary};
            }
        }
        .ant-tabs-tab {
            padding: 8px 12px;
            font-size: 13px;
        }
        .ant-tabs-content-holder {
            flex: 1;
            overflow: hidden;
        }
        .ant-tabs-content {
            height: 100%;
        }
        .ant-tabs-tabpane {
            height: 100%;
        }
    `,toolbar:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,toolbarBtn:e`
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,emptyContainer:e`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 24px;
    `,clockIcon:e`
        width: 64px;
        height: 64px;
        color: ${t.colorTextQuaternary};
        margin-bottom: 16px;
    `,emptyText:e`
        font-size: 13px;
        color: ${t.colorTextSecondary};
        text-align: center;
        margin-bottom: 16px;
        line-height: 1.5;
    `,createBtn:e`
        padding: 6px 16px;
        font-size: 13px;
        color: ${t.colorText};
        background: transparent;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            border-color: ${t.colorText};
        }
    `})),ra=()=>{let{styles:e}=ro(),{t:r}=(0,n.useTranslation)("workspace");return(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",height:"100%"},children:[(0,t.jsxs)("div",{className:e.toolbar,children:[(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(re.Plus,{size:16})}),(0,t.jsxs)(t7.Flexbox,{horizontal:!0,gap:2,children:[(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(eM.Search,{size:14})}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(rt,{size:14})}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(rr.MoreHorizontal,{size:14})})]})]}),(0,t.jsxs)("div",{className:e.emptyContainer,children:[(0,t.jsx)(rn.Clock,{className:e.clockIcon,strokeWidth:1}),(0,t.jsx)("div",{className:e.emptyText,children:r("alarmsPanel.emptyDescription")}),(0,t.jsx)("button",{className:e.createBtn,children:r("alarmsPanel.createAlert")})]})]})},ri=()=>{let{styles:e}=ro(),{t:r}=(0,n.useTranslation)("workspace");return(0,t.jsx)("div",{className:e.emptyContainer,children:(0,t.jsx)(t9.Empty,{image:t9.Empty.PRESENTED_IMAGE_SIMPLE,description:r("alarmsPanel.noLogEntries")})})},rl=()=>{let{styles:e}=ro(),{t:r}=(0,n.useTranslation)("workspace");return(0,t.jsx)("div",{className:e.container,children:(0,t.jsx)(t5.Tabs,{className:e.tabs,defaultActiveKey:"alarms",centered:!0,size:"small",items:[{key:"alarms",label:r("alarmsPanel.tabAlerts"),children:(0,t.jsx)(ra,{})},{key:"log",label:r("alarmsPanel.tabLog"),children:(0,t.jsx)(ri,{})}]})})},rs=(0,l.default)("folder-plus",[["path",{d:"M12 10v6",key:"1bos4e"}],["path",{d:"M9 13h6",key:"1uhe8q"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]),rc=(0,l.default)("funnel",[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]]),ru=(0,l.default)("square-check-big",[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);var rd=e.i(177522),rp=e.i(163545),rf=e.i(991998);let rm=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        flex-direction: column;
        height: 100%;
    `,tabs:e`
        .ant-tabs-nav {
            margin: 0;
            padding: 0 4px;

            &::before {
                border-bottom: 1px solid ${t.colorBorderSecondary};
            }
        }
        .ant-tabs-tab {
            padding: 8px 12px;
            font-size: 13px;
        }
        .ant-tabs-content-holder {
            flex: 1;
            overflow: hidden;
        }
        .ant-tabs-content {
            height: 100%;
        }
        .ant-tabs-tabpane {
            height: 100%;
        }
    `,toolbar:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,toolbarBtn:e`
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,treeList:e`
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
    `,treeItem:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;

        &:hover {
            background: ${t.colorFillQuaternary};
        }
    `,treeItemIcon:e`
        color: ${t.colorTextSecondary};
        flex-shrink: 0;
    `,treeItemLabel:e`
        font-size: 13px;
        color: ${t.colorText};
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,treeItemActions:e`
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.15s;

        .treeItem:hover & {
            opacity: 1;
        }
    `,actionBtn:e`
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextTertiary};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,childItem:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px 6px 36px;
        font-size: 12px;
        color: ${t.colorTextSecondary};
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
            background: ${t.colorFillQuaternary};
        }
    `,emptyContainer:e`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 24px;
    `})),rh=[{id:"adt",label:"ADT · NYSE, 1G",icon:"chart",children:[{id:"adt-vol",label:"Volume"}]},{id:"spx",label:"SPX · SPCFD",icon:"indicator",children:[]},{id:"ndq1",label:"NDQ · TVC",icon:"indicator",children:[]},{id:"ndq2",label:"NDQ · TVC",icon:"indicator",children:[]}],rg=()=>{let{styles:e,cx:n}=rm(),[o,a]=(0,r.useState)(new Set(["adt"]));return(0,t.jsxs)("div",{style:{display:"flex",flexDirection:"column",height:"100%"},children:[(0,t.jsxs)("div",{className:e.toolbar,children:[(0,t.jsxs)(t7.Flexbox,{horizontal:!0,gap:2,children:[(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(rs,{size:14})}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(ej.Copy,{size:14})}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(rc,{size:14})})]}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(ru,{size:14})})]}),(0,t.jsx)("div",{className:e.treeList,children:rh.map(r=>{let i=o.has(r.id);return(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:n(e.treeItem,"treeItem"),onClick:()=>{var e;return e=r.id,void a(t=>{let r=new Set(t);return r.has(e)?r.delete(e):r.add(e),r})},children:[(0,t.jsx)("span",{className:e.treeItemIcon,children:i?(0,t.jsx)(ek.ChevronDown,{size:14}):(0,t.jsx)(u.ChevronRight,{size:14})}),(0,t.jsx)("span",{className:e.treeItemIcon,children:"chart"===r.icon?(0,t.jsx)(rd.CandlestickChart,{size:14}):(0,t.jsx)(rp.TrendingUp,{size:14})}),(0,t.jsx)("span",{className:e.treeItemLabel,children:r.label})]}),i&&r.children?.map(r=>(0,t.jsxs)("div",{className:e.childItem,children:[(0,t.jsx)(rp.TrendingUp,{size:12}),r.label]},r.id))]},r.id)})})]})},ry=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
    `,dateRow:e`
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,dateLabel:e`
        font-size: 13px;
        color: ${t.colorTextSecondary};
    `,dateValue:e`
        font-size: 13px;
        color: ${t.colorText};
        font-weight: 500;
    `,symbolHeader:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,symbolIcon:e`
        color: ${t.colorTextSecondary};
    `,symbolName:e`
        font-size: 13px;
        color: ${t.colorText};
        font-weight: 500;
    `,dataList:e`
        display: flex;
        flex-direction: column;
    `,dataRow:e`
        display: flex;
        justify-content: space-between;
        padding: 10px 16px;
        
        &:hover {
            background: ${t.colorFillQuaternary};
        }
    `,dataLabel:e`
        font-size: 13px;
        color: ${t.colorTextSecondary};
    `,dataValue:e`
        font-size: 13px;
        font-weight: 500;
        font-family: 'SF Mono', Consolas, monospace;
    `,positive:e`
        color: ${a.GREEN};
    `,negative:e`
        color: ${a.RED};
    `,neutral:e`
        color: ${t.colorText};
    `})),rb={symbol:"BTC/USDT",exchange:"Binance",timeframe:"1D",date:new Date,open:97450.32,high:98850,low:96200.5,close:98245.67,change:795.35,changePercent:.82,volume:241e7,lastDayChange:1245.67,lastDayChangePercent:1.28},rx=()=>{var e;let r,{t:o}=(0,n.useTranslation)("workspace"),{styles:a,cx:i}=ry(),l=(0,rf.useFormatSymbolPrice)("BTCUSDT"),s=e=>e>0?a.positive:e<0?a.negative:a.neutral,c=(e,t)=>`${l(e)} (${t>=0?"+":""}${t.toFixed(2)}%)`;return(0,t.jsxs)("div",{className:a.container,children:[(0,t.jsxs)("div",{className:a.dateRow,children:[(0,t.jsx)("span",{className:a.dateLabel,children:o("objectTreePanel.date")}),(0,t.jsx)("span",{className:a.dateValue,children:(r=rb.date,(0,tt.formatDate)(r,{weekday:"short",day:"2-digit",month:"short",year:"2-digit"}))})]}),(0,t.jsxs)("div",{className:a.symbolHeader,children:[(0,t.jsx)(rd.CandlestickChart,{size:16,className:a.symbolIcon}),(0,t.jsxs)("span",{className:a.symbolName,children:[rb.symbol," · ",rb.timeframe," · ",rb.exchange]})]}),(0,t.jsxs)("div",{className:a.dataList,children:[(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.open")}),(0,t.jsx)("span",{className:i(a.dataValue,a.neutral),children:l(rb.open)})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.high")}),(0,t.jsx)("span",{className:i(a.dataValue,a.neutral),children:l(rb.high)})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.low")}),(0,t.jsx)("span",{className:i(a.dataValue,a.neutral),children:l(rb.low)})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.close")}),(0,t.jsx)("span",{className:i(a.dataValue,a.neutral),children:l(rb.close)})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.change")}),(0,t.jsx)("span",{className:i(a.dataValue,s(rb.change)),children:c(rb.change,rb.changePercent)})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.volume")}),(0,t.jsx)("span",{className:i(a.dataValue,a.neutral),children:(e=rb.volume)>=1e9?`${(e/1e9).toFixed(2)}B`:e>=1e6?`${(e/1e6).toFixed(2)}M`:e>=1e3?`${(e/1e3).toFixed(2)}K`:e.toString()})]}),(0,t.jsxs)("div",{className:a.dataRow,children:[(0,t.jsx)("span",{className:a.dataLabel,children:o("objectTreePanel.lastDayChange")}),(0,t.jsx)("span",{className:i(a.dataValue,s(rb.lastDayChange)),children:c(rb.lastDayChange,rb.lastDayChangePercent)})]})]})]})},rv=()=>{let{t:e}=(0,n.useTranslation)("workspace"),{styles:r}=rm();return(0,t.jsx)("div",{className:r.container,children:(0,t.jsx)(t5.Tabs,{className:r.tabs,defaultActiveKey:"tree",centered:!0,size:"small",items:[{key:"tree",label:e("objectTreePanel.tabObjectTree"),children:(0,t.jsx)(rg,{})},{key:"data",label:e("objectTreePanel.tabDataWindow"),children:(0,t.jsx)(rx,{})}]})})},rw=(0,l.default)("square-pen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]),rS=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        flex-direction: column;
        height: 100%;
    `,toolbar:e`
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 6px 8px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,toolbarBtn:e`
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,emptyContainer:e`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 24px;
    `,emptyText:e`
        font-size: 13px;
        color: ${t.colorTextTertiary};
        font-style: italic;
    `})),rk=()=>{let{styles:e}=rS(),{t:r}=(0,n.useTranslation)("workspace");return(0,t.jsxs)("div",{className:e.container,children:[(0,t.jsx)("div",{className:e.toolbar,children:(0,t.jsxs)(t7.Flexbox,{horizontal:!0,gap:2,children:[(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(rw,{size:14})}),(0,t.jsx)("div",{className:e.toolbarBtn,children:(0,t.jsx)(eM.Search,{size:14})})]})}),(0,t.jsx)("div",{className:e.emptyContainer,children:(0,t.jsx)("span",{className:e.emptyText,children:r("messagesPanel.noPrivateMessages")})})]})};var rj=e.i(364864),r$=e.i(90049),rC=e.i(699323),rT=e.i(548631),rM=e.i(850019);let rN="workspace-right-panel-width",rE="workspace-right-panel-bottom-height",rI=r.default.useLayoutEffect,rD=(e,t)=>{try{let r=window.localStorage.getItem(e);if(!r)return t;let n=parseFloat(r);return Number.isFinite(n)?n:t}catch{return t}},rP=(e,t)=>{try{window.localStorage.setItem(rN,String(e)),window.localStorage.setItem(rE,String(t))}catch{}},rO=(0,o.createStyles)(({css:e,token:t})=>({wrapper:e`
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    `,draggablePanel:e`
        & .ant-draggable-panel-left-handle,
        & .ant-draggable-panel-right-handle {
            z-index: 100 !important;
        }

        & .ant-draggable-panel-left-handle::before,
        & .ant-draggable-panel-right-handle::before {
            z-index: 100 !important;
        }
    `,header:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        height: 40px;
        min-height: 40px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,title:e`
        font-size: 13px;
        font-weight: 600;
        color: ${t.colorText};
    `,closeBtn:e`
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,content:e`
        flex: 1;
        overflow: hidden;
    `,splitContainer:e`
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        overflow: hidden;
    `,topSection:e`
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `,topSectionContent:e`
        flex: 1;
        min-height: 0;
        overflow: hidden;
    `,fundingRateStrip:e`
        border-top: 2px solid rgba(255, 255, 255, 0.25);
        flex-shrink: 0;
    `,bottomSection:e`
        flex-shrink: 0;
        background: ${t.colorBgContainer};
        border-top: 1px solid ${t.colorBorderSecondary};
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `,bottomSlideWrapper:e`
        flex-shrink: 0;
        overflow: hidden;
        transition: max-height 0.25s ease;
    `,splitter:e`
        height: 6px;
        flex-shrink: 0;
        background: ${t.colorBgContainer};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: row-resize;
        user-select: none;
    `,splitterGrip:e`
        color: ${t.colorTextQuaternary};
    `,bottomContent:e`
        flex: 1;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    `})),rz=({panelId:e})=>{switch(e){case"alarms":return(0,t.jsx)(rl,{});case"objectTree":return(0,t.jsx)(rv,{});case"messages":return(0,t.jsx)(rk,{});default:return null}},rA=(0,r.memo)(function({children:e,isBottomPanelOpen:n,bottomContent:o,showFundingRate:a,fundingRateSymbol:i,fundingRateSymbolIcon:l,marketType:s="futures",initialBottomHeight:c,onBottomHeightChange:u,panelStyles:d,resizeLabel:p}){let f=(0,r.useRef)(null),m=(0,r.useRef)(null),h=(0,r.useRef)(null),[g,y]=(0,r.useState)(c??280),b=(0,r.useRef)(c??280),x=(0,r.useRef)(!1),v=(0,r.useRef)(0),w=(0,r.useRef)(0),S=(0,r.useRef)(null),[k,j]=(0,r.useState)(c);c!==k&&"number"==typeof c&&Number.isFinite(c)&&(j(c),y(c),b.current=c),(0,r.useEffect)(()=>{b.current=g},[g]);let $=(0,r.useCallback)(e=>{e.preventDefault(),x.current=!0,v.current=e.clientY,w.current=b.current;let t=e=>{if(!x.current||!f.current)return;let t=v.current-e.clientY,r=Math.min(Math.floor(.7*f.current.offsetHeight),Math.max(120,w.current+t));b.current=r,null===S.current&&(S.current=requestAnimationFrame(()=>{S.current=null,m.current&&(m.current.style.height=`${r}px`),h.current&&(h.current.style.maxHeight=`${r+6}px`)}))},r=()=>{x.current=!1,null!==S.current&&(cancelAnimationFrame(S.current),S.current=null),y(b.current),u?.(b.current),h.current&&(h.current.style.transition=""),document.removeEventListener("mousemove",t),document.removeEventListener("mouseup",r),document.body.style.cursor="",document.body.style.userSelect=""};document.body.style.cursor="row-resize",document.body.style.userSelect="none",h.current&&(h.current.style.transition="none"),document.addEventListener("mousemove",t),document.addEventListener("mouseup",r)},[u]),C=(0,t.jsxs)("div",{className:d.topSection,children:[(0,t.jsx)("div",{className:d.topSectionContent,children:e}),a&&i&&(0,t.jsx)("div",{className:d.fundingRateStrip,children:(0,t.jsx)(rj.FundingRateCard,{symbol:i,symbolIcon:l,marketType:s})})]});return(0,t.jsxs)("div",{className:d.splitContainer,ref:f,children:[C,(0,t.jsxs)("div",{ref:h,className:d.bottomSlideWrapper,style:{maxHeight:n?g+6:0},children:[(0,t.jsx)("div",{className:d.splitter,onMouseDown:$,title:p,children:(0,t.jsx)(ex,{size:14,className:d.splitterGrip})}),(0,t.jsx)("div",{ref:m,className:d.bottomSection,style:{height:g},children:o?(0,t.jsx)("div",{className:d.bottomContent,children:o}):null})]})]})}),rR=function({styleBundle:e,t:n}){let{styles:o}=e,a=(0,r.useMemo)(()=>({watchlist:n("panels.watchlist"),alarms:n("panels.alerts"),objectTree:n("panels.objectTree"),messages:n("panels.messages")}),[n]),{activeRightPanel:i,toggleRightPanel:l}=em(),{isBotChatOpen:s,setBotChatOpen:c}=eh(),{isSymbolInfoOpen:u,setSymbolInfoOpen:d}=eg(),p=s||u,[f,m]=(0,r.useState)(i);(0,r.useEffect)(()=>{if(i)return void m(e=>e===i?e:i);if(!f||p)return;let e=window.setTimeout(()=>{m(null)},1e4);return()=>window.clearTimeout(e)},[i,p,f]);let h=i??f,g=(0,eX.useWatchlistMarketType)(),y=(0,eX.useSelectedSymbol)(),b=(0,eX.useSymbolsWithMainAsset)(),x=(0,r$.useChartStore)(e=>{let t=e.paneSymbols[`grid-${e.activePane}`];return e.chartSyncSettings.syncSymbol?e.syncedSymbol||t||null:t||null}),v=null!==i,w="watchlist"===h,S=x||y,k=w&&S?(0,rC.symbolToWatchlistPriceKey)(S):w?"BTCUSDT":void 0,j=(0,r.useMemo)(()=>{if(!k)return!1;let e=(0,rT.findSymbolAssetEntry)(k,b);return(0,rM.isPendingTradingStatus)(e?.status)},[k,b]),$=(0,r.useMemo)(()=>k&&0!==b.length?(0,tR.resolveUcidFromWatchlist)(k,b):null,[k,b]),C=(0,tq.getSymbolLogoUrl)($)??void 0,T=(0,r.useMemo)(()=>(0,tR.resolveUcidFromWatchlist)(y,b),[y,b]);(0,r.useEffect)(()=>{u&&T&&(0,tR.loadSymbolStats)(T)},[T,u]);let[M,N]=(0,r.useState)(!1),E=(0,r.useRef)(null);(0,r.useEffect)(()=>(0,rj.subscribeStickyCardPipOpen)(N),[]),k&&(E.current={symbol:k,symbolIcon:C,marketType:g});let[I,D]=(0,r.useState)(!1),[P,O]=(0,r.useState)(!1),[z,A]=(0,r.useState)(530),[R,L]=(0,r.useState)(280),[F,B]=(0,r.useState)(!1),H=(0,r.useRef)(null),W=(0,r.useRef)(530),U=(0,r.useRef)(280),Y=(0,r.useRef)(!1),_=(0,r.useRef)(null),V=(0,r.useCallback)(()=>{null!==_.current&&window.clearTimeout(_.current),_.current=window.setTimeout(()=>{_.current=null,Y.current&&rP(W.current,U.current)},200)},[]);rI(()=>{let e=Math.min(600,Math.max(300,Math.round(rD(rN,530)))),t=rD(rE,280),r=Math.min(Math.floor(.7*Math.max(120,window.innerHeight-56)),Math.max(120,Math.round(t)));W.current=e,U.current=r,Y.current=!0,A(e),L(r),B(!0)},[]),(0,r.useEffect)(()=>()=>{null!==_.current&&(window.clearTimeout(_.current),_.current=null),Y.current&&rP(W.current,U.current)},[]);let q=(0,r.useCallback)(()=>{c(!1)},[c]),K=(0,r.useCallback)(()=>{d(!1)},[d]);rI(()=>{s&&D(!0)},[s]),rI(()=>{u&&O(!0)},[u]);let[X,G]=(0,r.useState)(()=>s?"bot":u?"symbolInfo":null),Q=s?"bot":u?"symbolInfo":null;rI(()=>{Q&&G(Q)},[Q]);let Z=(0,r.useMemo)(()=>{let e=Q??X;return"bot"===e&&(s||I)?(0,t.jsx)(tA,{onClose:q}):"symbolInfo"===e&&(u||P)?(0,t.jsx)(t8,{onClose:K,isActive:u}):null},[Q,X,q,K,I,P,s,u]),J=(0,r.useCallback)((e,t)=>{if(!F)return;let r=t?.width,n="number"==typeof r?r:"string"==typeof r?parseFloat(r):NaN;if(!Number.isFinite(n)||n<=0)return;let o=Math.min(600,Math.max(300,Math.round(n)));W.current!==o&&(W.current=o,V())},[F,V]),ee=(0,r.useCallback)(e=>{if(!Number.isFinite(e)||e<=0)return;let t=Math.round(e);U.current!==t&&(U.current=t,L(t),V())},[V]),et=(0,r.useCallback)(e=>{!e&&i&&l(i)},[i,l]),er=(0,r.useMemo)(()=>({width:z}),[z]),en=(0,r.useMemo)(()=>(0,t.jsx)(ev.Watchlist,{}),[]);return F?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(ey.DraggablePanel,{className:o.draggablePanel,placement:"right",mode:"fixed",pin:!0,showHandleWhenCollapsed:!1,showHandleHighlight:!0,expand:v,defaultSize:er,minWidth:300,maxWidth:600,onSizeChange:J,onExpandChange:et,children:h&&(0,t.jsxs)("div",{"aria-hidden":!v,className:o.wrapper,inert:!v,ref:H,children:["watchlist"!==h&&(0,t.jsxs)("div",{className:o.header,children:[(0,t.jsx)("span",{className:o.title,children:a[h]}),(0,t.jsx)("div",{className:o.closeBtn,onClick:()=>l(h),children:(0,t.jsx)(eb.X,{size:16})})]}),(0,t.jsx)("div",{className:o.content,children:"watchlist"===h?(0,t.jsx)(rA,{isBottomPanelOpen:p,bottomContent:Z,showFundingRate:!j,fundingRateSymbol:k,fundingRateSymbolIcon:C,marketType:g,initialBottomHeight:R,onBottomHeightChange:ee,panelStyles:o,resizeLabel:n("panels.resize"),children:en}):(0,t.jsx)(rA,{isBottomPanelOpen:p,bottomContent:Z,showFundingRate:!1,initialBottomHeight:R,onBottomHeightChange:ee,panelStyles:o,resizeLabel:n("panels.resize"),children:(0,t.jsx)(rz,{panelId:h})})})]})}),!w&&M&&E.current&&(0,t.jsx)(rj.FundingRateCard,{symbol:E.current.symbol,symbolIcon:E.current.symbolIcon,marketType:E.current.marketType,pictureInPictureHostOnly:!0})]}):null},rL=(0,r.memo)(function(){let e=rO(),{t:r}=(0,n.useTranslation)("workspace");return(0,t.jsx)(rR,{styleBundle:e,t:r})});function rF(){return(rF=Object.assign.bind()).apply(this,arguments)}var rB=["cdnSuffix","cdnUrl","countryCode","style","svg"];let rH=function(e){var t=e.cdnSuffix,n=e.cdnUrl,o=e.countryCode,a=e.style,i=e.svg,l=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,rB);if("string"!=typeof o)return null;if(void 0!==i&&i){var s=""+(void 0===n?"https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/":n)+o.toLowerCase()+"."+(void 0===t?"svg":t);return(0,r.createElement)("img",Object.assign({},l,{src:s,style:rF({display:"inline-block",width:"1em",height:"1em",verticalAlign:"middle"},a)}))}var c=o.toUpperCase().replace(/./g,function(e){return String.fromCodePoint(e.charCodeAt(0)+127397)});return(0,r.createElement)("span",Object.assign({role:"img"},l,{style:rF({display:"inline-block",fontSize:"1em",lineHeight:"1em",verticalAlign:"middle"},a)}),c)},rW=(0,l.default)("calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]]),rU=(0,l.default)("chart-no-axes-column",[["path",{d:"M5 21v-6",key:"1hz6c0"}],["path",{d:"M12 21V3",key:"1lcnhd"}],["path",{d:"M19 21V9",key:"unv183"}]]);var rY=e.i(883864),r_=e.i(102273),rV=e.i(886560),rq=e.i(130696),rK=e.i(661858),rX=e.i(548032),rG=e.i(708920),rQ=e.i(978171),rZ=e.i(630446),rJ=e.i(664836),r0=e.i(315279),r1=e.i(652214);rX.default.extend(r1.default),rX.default.extend(r0.default),rX.default.extend(rG.default),rX.default.extend(rQ.default),rX.default.extend(rZ.default),rX.default.extend(rJ.default),rX.default.extend(function(e,t){var r=t.prototype,n=r.format;r.format=function(e){var t=(e||"").replace("Wo","wo");return n.bind(this)(t)}});var r2={bn_BD:"bn-bd",by_BY:"be",en_GB:"en-gb",en_US:"en",fr_BE:"fr",fr_CA:"fr-ca",hy_AM:"hy-am",kmr_IQ:"ku",nl_BE:"nl-be",pt_BR:"pt-br",zh_CN:"zh-cn",zh_HK:"zh-hk",zh_TW:"zh-tw"},r4=function(e){return r2[e]||e.split("_")[0]},r6=function(){};e.i(484575);var r3=e.i(176235),r8=e.i(243158),r5=e.i(197649),r9=e.i(425834),r7=(e.i(715070),e.i(416099)),ne=e.i(490172),nt=e.i(442482),nr=r.createContext(null);function nn(e,t){for(var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"0",n=String(e);n.length<t;)n="".concat(r).concat(n);return n}function no(e){return null==e?[]:Array.isArray(e)?e:[e]}function na(e,t){var r={};return(t||Object.keys(e)).forEach(function(t){void 0!==e[t]&&(r[t]=e[t])}),r}function ni(e,t,r){if(r)return r;switch(e){case"time":return t.fieldTimeFormat;case"datetime":return t.fieldDateTimeFormat;case"month":return t.fieldMonthFormat;case"year":return t.fieldYearFormat;case"quarter":return t.fieldQuarterFormat;case"week":return t.fieldWeekFormat;default:return t.fieldDateFormat}}function nl(e){return(nl="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function ns(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function nc(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?ns(Object(r),!0).forEach(function(t){var n,o,a;n=e,o=t,a=r[t],(o=function(e){var t=function(e,t){if("object"!=nl(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=nl(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==nl(t)?t:String(t)}(o))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):ns(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function nu(e){return(nu="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function nd(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function np(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?nd(Object(r),!0).forEach(function(t){var n,o,a;n=e,o=t,a=r[t],(o=function(e){var t=function(e,t){if("object"!=nu(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=nu(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==nu(t)?t:String(t)}(o))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):nd(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function nf(e,t,r,n,o){var a="",i=[];return e&&i.push(o?"hh":"HH"),t&&i.push("mm"),r&&i.push("ss"),a=i.join(":"),n&&(a+=".SSS"),o&&(a+=" A"),a}function nm(e,t){var n=t.showHour,o=t.showMinute,a=t.showSecond,i=t.showMillisecond,l=t.use12Hours;return r.default.useMemo(function(){var t,r,s,c,u,d,p,f,m,h,g,y,b;return t=e.fieldDateTimeFormat,r=e.fieldDateFormat,s=e.fieldTimeFormat,c=e.fieldMonthFormat,u=e.fieldYearFormat,d=e.fieldWeekFormat,p=e.fieldQuarterFormat,f=e.yearFormat,m=e.cellYearFormat,h=e.cellQuarterFormat,g=e.dayFormat,y=e.cellDateFormat,b=nf(n,o,a,i,l),np(np({},e),{},{fieldDateTimeFormat:t||"YYYY-MM-DD ".concat(b),fieldDateFormat:r||"YYYY-MM-DD",fieldTimeFormat:s||b,fieldMonthFormat:c||"YYYY-MM",fieldYearFormat:u||"YYYY",fieldWeekFormat:d||"gggg-wo",fieldQuarterFormat:p||"YYYY-[Q]Q",yearFormat:f||"YYYY",cellYearFormat:m||"YYYY",cellQuarterFormat:h||"[Q]Q",cellDateFormat:y||g||"D"})},[e,n,o,a,i,l])}function nh(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function ng(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?nh(Object(r),!0).forEach(function(t){var n,o,a;n=e,o=t,a=r[t],(o=function(e){var t=function(e,t){if("object"!=nx(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=nx(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==nx(t)?t:String(t)}(o))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):nh(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function ny(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||function(e,t){if(e){if("string"==typeof e)return nb(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return nb(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function nb(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function nx(e){return(nx="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function nv(e,t,r){return null!=r?r:t.some(function(t){return e.includes(t)})}var nw=["showNow","showHour","showMinute","showSecond","showMillisecond","use12Hours","hourStep","minuteStep","secondStep","millisecondStep","hideDisabledOptions","defaultValue","disabledHours","disabledMinutes","disabledSeconds","disabledMilliseconds","disabledTime","changeOnScroll","defaultOpenValue"];function nS(e,t,r,n){return[e,t,r,n].some(function(e){return void 0!==e})}function nk(e,t,r,n,o){var a=t,i=r,l=n;if(e||a||i||l||o){if(e){var s,c,u,d=[a,i,l].some(function(e){return!1===e}),p=[a,i,l].some(function(e){return!0===e}),f=!!d||!p;a=null!=(s=a)?s:f,i=null!=(c=i)?c:f,l=null!=(u=l)?u:f}}else a=!0,i=!0,l=!0;return[a,i,l,o]}function nj(e){var t,r,n,o,a=e.showTime,i=ny((t=na(e,nw),r=e.format,n=e.picker,o=null,r&&(Array.isArray(o=r)&&(o=o[0]),o="object"===nx(o)?o.format:o),"time"===n&&(t.format=o),[t,o]),2),l=i[0],s=i[1],c=a&&"object"===nx(a)?a:{},u=ng(ng({defaultOpenValue:c.defaultOpenValue||c.defaultValue},l),c),d=u.showMillisecond,p=u.showHour,f=u.showMinute,m=u.showSecond,h=ny(nk(nS(p,f,m,d),p,f,m,d),3);return p=h[0],f=h[1],m=h[2],[u,ng(ng({},u),{},{showHour:p,showMinute:f,showSecond:m,showMillisecond:d}),u.format,s]}function n$(e,t,r,n,o){var a="time"===e;if("datetime"===e||a){for(var i=ni(e,o,null),l=[t,r],s=0;s<l.length;s+=1){var c=no(l[s])[0];if(c&&"string"==typeof c){i=c;break}}var u=n.showHour,d=n.showMinute,p=n.showSecond,f=n.showMillisecond,m=nv(i,["a","A","LT","LLL","LTS"],n.use12Hours),h=nS(u,d,p,f);h||(u=nv(i,["H","h","k","LT","LLL"]),d=nv(i,["m","LT","LLL"]),p=nv(i,["s","LTS"]),f=nv(i,["SSS"]));var g=ny(nk(h,u,d,p,f),3);u=g[0],d=g[1],p=g[2];var y=t||nf(u,d,p,f,m);return ng(ng({},n),{},{format:y,showHour:u,showMinute:d,showSecond:p,showMillisecond:f,use12Hours:m})}return null}function nC(e,t,r){return!e&&!t||e===t||!!e&&!!t&&r()}function nT(e,t,r){return nC(t,r,function(){return Math.floor(e.getYear(t)/10)===Math.floor(e.getYear(r)/10)})}function nM(e,t,r){return nC(t,r,function(){return e.getYear(t)===e.getYear(r)})}function nN(e,t){return Math.floor(e.getMonth(t)/3)+1}function nE(e,t,r){return nC(t,r,function(){return nM(e,t,r)&&e.getMonth(t)===e.getMonth(r)})}function nI(e,t,r){return nC(t,r,function(){return nM(e,t,r)&&nE(e,t,r)&&e.getDate(t)===e.getDate(r)})}function nD(e,t,r){return nC(t,r,function(){return e.getHour(t)===e.getHour(r)&&e.getMinute(t)===e.getMinute(r)&&e.getSecond(t)===e.getSecond(r)})}function nP(e,t,r){return nC(t,r,function(){return nI(e,t,r)&&nD(e,t,r)&&e.getMillisecond(t)===e.getMillisecond(r)})}function nO(e,t,r,n){return nC(r,n,function(){var o=e.locale.getWeekFirstDate(t,r),a=e.locale.getWeekFirstDate(t,n);return nM(e,o,a)&&e.locale.getWeek(t,r)===e.locale.getWeek(t,n)})}function nz(e,t,r,n,o){switch(o){case"date":return nI(e,r,n);case"week":return nO(e,t.locale,r,n);case"month":return nE(e,r,n);case"quarter":return nC(r,n,function(){return nM(e,r,n)&&nN(e,r)===nN(e,n)});case"year":return nM(e,r,n);case"decade":return nT(e,r,n);case"time":return nD(e,r,n);default:return nP(e,r,n)}}function nA(e,t,r,n){return!!t&&!!r&&!!n&&e.isAfter(n,t)&&e.isAfter(r,n)}function nR(e,t,r,n,o){return!!nz(e,t,r,n,o)||e.isAfter(r,n)}function nL(e,t){var r=t.generateConfig,n=t.locale,o=t.format;return e?"function"==typeof o?o(e):r.locale.format(n.locale,e,o):""}function nF(e,t,r){var n=t,o=["getHour","getMinute","getSecond","getMillisecond"];return["setHour","setMinute","setSecond","setMillisecond"].forEach(function(t,a){n=r?e[t](n,e[o[a]](r)):e[t](n,0)}),n}var nB=e.i(828051);function nH(e,t){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,o=r.useRef(t);o.current=t,(0,r9.useLayoutUpdateEffect)(function(){if(e)o.current(e);else{var t=(0,nB.default)(function(){o.current(e)},n);return function(){nB.default.cancel(t)}}},[e])}var nW=e.i(811411);function nU(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function nY(e){return(nY="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function n_(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function nV(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?n_(Object(r),!0).forEach(function(t){var n,o,a;n=e,o=t,a=r[t],(o=function(e){var t=function(e,t){if("object"!=nY(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=nY(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==nY(t)?t:String(t)}(o))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):n_(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function nq(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||function(e,t){if(e){if("string"==typeof e)return nK(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return nK(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function nK(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function nX(){return[]}function nG(e,t){for(var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,n=arguments.length>3&&void 0!==arguments[3]&&arguments[3],o=arguments.length>4&&void 0!==arguments[4]?arguments[4]:[],a=arguments.length>5&&void 0!==arguments[5]?arguments[5]:2,i=[],l=r>=1?0|r:1,s=e;s<=t;s+=l){var c=o.includes(s);c&&n||i.push({label:nn(s,a),value:s,disabled:c})}return i}function nQ(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=arguments.length>2?arguments[2]:void 0,o=t||{},a=o.use12Hours,i=o.hourStep,l=void 0===i?1:i,s=o.minuteStep,c=void 0===s?1:s,u=o.secondStep,d=void 0===u?1:u,p=o.millisecondStep,f=void 0===p?100:p,m=o.hideDisabledOptions,h=o.disabledTime,g=o.disabledHours,y=o.disabledMinutes,b=o.disabledSeconds,x=r.useMemo(function(){return n||e.getNow()},[n,e]),v=r.useCallback(function(e){var t=(null==h?void 0:h(e))||{};return[t.disabledHours||g||nX,t.disabledMinutes||y||nX,t.disabledSeconds||b||nX,t.disabledMilliseconds||nX]},[h,g,y,b]),w=nq(r.useMemo(function(){return v(x)},[x,v]),4),S=w[0],k=w[1],j=w[2],$=w[3],C=r.useCallback(function(e,t,r,n){var o=nG(0,23,l,m,e());return[a?o.map(function(e){return nV(nV({},e),{},{label:nn(e.value%12||12,2)})}):o,function(e){return nG(0,59,c,m,t(e))},function(e,t){return nG(0,59,d,m,r(e,t))},function(e,t,r){return nG(0,999,f,m,n(e,t,r),3)}]},[m,l,a,f,c,d]),T=nq(r.useMemo(function(){return C(S,k,j,$)},[C,S,k,j,$]),4),M=T[0],N=T[1],E=T[2],I=T[3];return[function(t,r){var n=function(){return M},o=N,a=E,i=I;if(r){var l=nq(v(r),4),s=nq(C(l[0],l[1],l[2],l[3]),4),c=s[0],u=s[1],d=s[2],p=s[3];n=function(){return c},o=u,a=d,i=p}return function(e,t,r,n,o,a){var i=e;function l(e,t,r){var n=a[e](i),o=r.find(function(e){return e.value===n});if(!o||o.disabled){var l=r.filter(function(e){return!e.disabled}),s=((function(e){if(Array.isArray(e))return nU(e)})(l)||function(e){if("u">typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(l)||function(e){if(e){if("string"==typeof e)return nU(e,void 0);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return nU(e,void 0)}}(l)||function(){throw TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()).reverse().find(function(e){return e.value<=n})||l[0];s&&(n=s.value,i=a[t](i,n))}return n}var s=l("getHour","setHour",t()),c=l("getMinute","setMinute",r(s)),u=l("getSecond","setSecond",n(s,c));return l("getMillisecond","setMillisecond",o(s,c,u)),i}(t,n,o,a,i,e)},M,N,E,I]}function nZ(e){return function(e){if(Array.isArray(e))return nJ(e)}(e)||function(e){if("u">typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||function(e){if(e){if("string"==typeof e)return nJ(e,void 0);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return nJ(e,void 0)}}(e)||function(){throw TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function nJ(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}var n0=r.createContext(null),n1=r.createContext(null);function n2(){return r.useContext(n1)}function n4(e,t){var n=e.prefixCls,o=e.generateConfig,a=e.locale,i=e.disabledDate,l=e.minDate,s=e.maxDate,c=e.cellRender,u=e.hoverValue,d=e.hoverRangeValue,p=e.onHover,f=e.values,m=e.pickerValue,h=e.onSelect,g=e.prevIcon,y=e.nextIcon,b=e.superPrevIcon,x=e.superNextIcon,v=r.useContext(n0),w=v.classNames,S=v.styles,k=o.getNow();return[{now:k,values:f,pickerValue:m,prefixCls:n,classNames:w,styles:S,disabledDate:i,minDate:l,maxDate:s,cellRender:c,hoverValue:u,hoverRangeValue:d,onHover:p,locale:a,generateConfig:o,onSelect:h,panelType:t,prevIcon:g,nextIcon:y,superPrevIcon:b,superNextIcon:x},k]}var n6=r.createContext({});function n3(e){return(n3="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function n8(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function n5(e,t,r){var n;return(n=function(e,t){if("object"!=n3(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=n3(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==n3(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function n9(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function n7(e){for(var t=e.rowNum,n=e.colNum,o=e.baseDate,a=e.getCellDate,i=e.prefixColumn,l=e.rowClassName,s=e.titleFormat,c=e.getCellText,u=e.getCellClassName,d=e.headerCells,p=e.cellSelection,f=void 0===p||p,m=e.disabledDate,h=n2(),g=h.prefixCls,y=h.classNames,b=h.styles,x=h.panelType,v=h.now,w=h.disabledDate,S=h.cellRender,k=h.onHover,j=h.hoverValue,$=h.hoverRangeValue,C=h.generateConfig,T=h.values,M=h.locale,N=h.onSelect,E=m||w,I="".concat(g,"-cell"),D=r.useContext(n6).onCellDblClick,P=function(e){return T.some(function(t){return t&&nz(C,M,e,t,x)})},O=[],z=0;z<t;z+=1){for(var A=[],R=void 0,L=0;L<n;L+=1)!function(){var e=a(o,z*n+L),t=null==E?void 0:E(e,{type:x});0===L&&(R=e,i&&A.push(i(R)));var l=!1,d=!1,p=!1;if(f&&$){var m=function(e){if(Array.isArray(e))return e}($)||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),2!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}($)||function(e){if(e){if("string"==typeof e)return n9(e,2);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return n9(e,2)}}($)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),h=m[0],w=m[1];l=nA(C,h,w,e),d=nz(C,M,e,h,x),p=nz(C,M,e,w,x)}var T=s?nL(e,{locale:M,format:s,generateConfig:C}):void 0,O=r.createElement("div",{className:"".concat(I,"-inner")},c(e));A.push(r.createElement("td",{key:L,title:T,className:(0,r5.clsx)(I,y.item,function(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?n8(Object(r),!0).forEach(function(t){n5(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):n8(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}(n5(n5(n5(n5(n5(n5({},"".concat(I,"-disabled"),t),"".concat(I,"-hover"),(j||[]).some(function(t){return nz(C,M,e,t,x)})),"".concat(I,"-in-range"),l&&!d&&!p),"".concat(I,"-range-start"),d),"".concat(I,"-range-end"),p),"".concat(g,"-cell-selected"),!$&&"week"!==x&&P(e)),u(e))),style:b.item,onClick:function(){t||N(e)},onDoubleClick:function(){!t&&D&&D()},onMouseEnter:function(){t||null==k||k(e)},onMouseLeave:function(){t||null==k||k(null)}},S?S(e,{prefixCls:g,originNode:O,today:v,type:x,locale:M}):O))}();O.push(r.createElement("tr",{key:z,className:null==l?void 0:l(R)},A))}return r.createElement("div",{className:(0,r5.clsx)("".concat(g,"-body"),y.body),style:b.body},r.createElement("table",{className:(0,r5.clsx)("".concat(g,"-content"),y.content),style:b.content},d&&r.createElement("thead",null,r.createElement("tr",null,d)),r.createElement("tbody",null,O)))}var oe={visibility:"hidden"};let ot=function(e){var t=e.offset,n=e.superOffset,o=e.onChange,a=e.getStart,i=e.getEnd,l=e.children,s=n2(),c=s.prefixCls,u=s.classNames,d=s.styles,p=s.prevIcon,f=s.nextIcon,m=s.superPrevIcon,h=s.superNextIcon,g=s.minDate,y=s.maxDate,b=s.generateConfig,x=s.locale,v=s.pickerValue,w=s.panelType,S="".concat(c,"-header"),k=r.useContext(n6),j=k.hidePrev,$=k.hideNext,C=k.hideHeader,T=r.useMemo(function(){return!!g&&!!t&&!!i&&!nR(b,x,i(t(-1,v)),g,w)},[g,t,v,i,b,x,w]),M=r.useMemo(function(){return!!g&&!!n&&!!i&&!nR(b,x,i(n(-1,v)),g,w)},[g,n,v,i,b,x,w]),N=r.useMemo(function(){return!!y&&!!t&&!!a&&!nR(b,x,y,a(t(1,v)),w)},[y,t,v,a,b,x,w]),E=r.useMemo(function(){return!!y&&!!n&&!!a&&!nR(b,x,y,a(n(1,v)),w)},[y,n,v,a,b,x,w]),I=function(e){t&&o(t(e,v))},D=function(e){n&&o(n(e,v))};if(C)return null;var P="".concat(S,"-prev-btn"),O="".concat(S,"-next-btn"),z="".concat(S,"-super-prev-btn"),A="".concat(S,"-super-next-btn");return r.createElement("div",{className:(0,r5.clsx)(S,u.header),style:d.header},n&&r.createElement("button",{type:"button","aria-label":x.previousYear,onClick:function(){return D(-1)},tabIndex:-1,className:(0,r5.clsx)(z,M&&"".concat(z,"-disabled")),disabled:M,style:j?oe:{}},void 0===m?"«":m),t&&r.createElement("button",{type:"button","aria-label":x.previousMonth,onClick:function(){return I(-1)},tabIndex:-1,className:(0,r5.clsx)(P,T&&"".concat(P,"-disabled")),disabled:T,style:j?oe:{}},void 0===p?"‹":p),r.createElement("div",{className:"".concat(S,"-view")},l),t&&r.createElement("button",{type:"button","aria-label":x.nextMonth,onClick:function(){return I(1)},tabIndex:-1,className:(0,r5.clsx)(O,N&&"".concat(O,"-disabled")),disabled:N,style:$?oe:{}},void 0===f?"›":f),n&&r.createElement("button",{type:"button","aria-label":x.nextYear,onClick:function(){return D(1)},tabIndex:-1,className:(0,r5.clsx)(A,E&&"".concat(A,"-disabled")),disabled:E,style:$?oe:{}},void 0===h?"»":h))};function or(e){return(or="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function on(){return(on=Object.assign.bind()).apply(this,arguments)}function oo(e,t,r){var n;return(n=function(e,t){if("object"!=or(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=or(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==or(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function oa(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oi(e){var t,n,o,a,i,l,s=e.prefixCls,c=e.panelName,u=e.locale,d=e.generateConfig,p=e.pickerValue,f=e.onPickerValueChange,m=e.onModeChange,h=e.mode,g=void 0===h?"date":h,y=e.disabledDate,b=e.onSelect,x=e.onHover,v=e.showWeek,w="".concat(s,"-").concat(void 0===c?"date":c,"-panel"),S="".concat(s,"-cell"),k="week"===g,j=function(e){if(Array.isArray(e))return e}(t=n4(e,g))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),2!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return oa(e,2);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oa(e,2)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),$=j[0],C=j[1],T=d.locale.getWeekFirstDay(u.locale),M=d.setDate(p,1),N=(n=u.locale,o=d.locale.getWeekFirstDay(n),a=d.setDate(M,1),i=d.getWeekDay(a),l=d.addDate(a,o-i),d.getMonth(l)===d.getMonth(M)&&d.getDate(l)>1&&(l=d.addDate(l,-7)),l),E=d.getMonth(p),I=(void 0===v?k:v)?function(e){var t=null==y?void 0:y(e,{type:"week"});return r.createElement("td",{key:"week",className:(0,r5.clsx)(S,"".concat(S,"-week"),oo({},"".concat(S,"-disabled"),t)),onClick:function(){t||b(e)},onMouseEnter:function(){t||null==x||x(e)},onMouseLeave:function(){t||null==x||x(null)}},r.createElement("div",{className:"".concat(S,"-inner")},d.locale.getWeek(u.locale,e)))}:null,D=[],P=u.shortWeekDays||(d.locale.getShortWeekDays?d.locale.getShortWeekDays(u.locale):[]);I&&D.push(r.createElement("th",{key:"empty"},r.createElement("span",{style:{width:0,height:0,position:"absolute",overflow:"hidden",opacity:0}},u.week)));for(var O=0;O<7;O+=1)D.push(r.createElement("th",{key:O},P[(O+T)%7]));var z=u.shortMonths||(d.locale.getShortMonths?d.locale.getShortMonths(u.locale):[]),A=r.createElement("button",{type:"button","aria-label":u.yearSelect,key:"year",onClick:function(){m("year",p)},tabIndex:-1,className:"".concat(s,"-year-btn")},nL(p,{locale:u,format:u.yearFormat,generateConfig:d})),R=r.createElement("button",{type:"button","aria-label":u.monthSelect,key:"month",onClick:function(){m("month",p)},tabIndex:-1,className:"".concat(s,"-month-btn")},u.monthFormat?nL(p,{locale:u,format:u.monthFormat,generateConfig:d}):z[E]),L=u.monthBeforeYear?[R,A]:[A,R];return r.createElement(n1.Provider,{value:$},r.createElement("div",{className:(0,r5.clsx)(w,v&&"".concat(w,"-show-week"))},r.createElement(ot,{offset:function(e){return d.addMonth(p,e)},superOffset:function(e){return d.addYear(p,e)},onChange:f,getStart:function(e){return d.setDate(e,1)},getEnd:function(e){var t=d.setDate(e,1);return t=d.addMonth(t,1),d.addDate(t,-1)}},L),r.createElement(n7,on({titleFormat:u.fieldDateFormat},e,{colNum:7,rowNum:6,baseDate:N,headerCells:D,getCellDate:function(e,t){return d.addDate(e,t)},getCellText:function(e){return nL(e,{locale:u,format:u.cellDateFormat,generateConfig:d})},getCellClassName:function(e){return oo(oo({},"".concat(s,"-cell-in-view"),nE(d,e,p)),"".concat(s,"-cell-today"),nI(d,e,C))},prefixColumn:I,cellSelection:!k}))))}var ol=e.i(841293),os=1/3;function oc(e){return(oc="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function ou(e,t,r){var n;return(n=function(e,t){if("object"!=oc(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oc(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==oc(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function od(e,t){if(e){if("string"==typeof e)return op(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return op(e,t)}}function op(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function of(e){var t,n,o,a,i,l,s,c=e.units,u=e.value,d=e.optionalValue,p=e.type,f=e.onChange,m=e.onHover,h=e.onDblClick,g=e.changeOnScroll,y=n2(),b=y.prefixCls,x=y.cellRender,v=y.now,w=y.locale,S=y.classNames,k=y.styles,j="".concat(b,"-time-panel-cell"),$=r.useRef(null),C=r.useRef(),T=function(){clearTimeout(C.current)},M=function(e){if(Array.isArray(e))return e}((t=null!=u?u:d,n=r.useRef(!1),o=r.useRef(null),a=r.useRef(null),i=function(){nB.default.cancel(o.current),n.current=!1},l=r.useRef(),s=[(0,r3.useEvent)(function(){var e=$.current;if(a.current=null,l.current=0,e){var r=e.querySelector('[data-value="'.concat(t,'"]')),s=e.querySelector("li");r&&s&&function t(){i(),n.current=!0,l.current+=1;var c=e.scrollTop,u=s.offsetTop,d=r.offsetTop,p=d-u;if(0===d&&r!==s||!(0,ol.default)(e)){l.current<=5&&(o.current=(0,nB.default)(t));return}var f=c+(p-c)*os,m=Math.abs(p-f);if(null!==a.current&&a.current<m)return void i();if(a.current=m,m<=1){e.scrollTop=p,i();return}e.scrollTop=f,o.current=(0,nB.default)(t)}()}}),i,function(){return n.current}]))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),3!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(s)||od(s,3)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),N=M[0],E=M[1],I=M[2];return(0,r9.default)(function(){return N(),T(),function(){E(),T()}},[u,d,c.map(function(e){return[e.value,e.label,e.disabled].join(",")}).join(";")]),r.createElement("ul",{className:"".concat("".concat(b,"-time-panel"),"-column"),ref:$,"data-type":p,onScroll:function(e){T();var t=e.target;!I()&&g&&(C.current=setTimeout(function(){var e=$.current,r=e.querySelector("li").offsetTop,n=Array.from(e.querySelectorAll("li")).map(function(e){return e.offsetTop-r}).map(function(e,r){return c[r].disabled?Number.MAX_SAFE_INTEGER:Math.abs(e-t.scrollTop)}),o=Math.min.apply(Math,function(e){if(Array.isArray(e))return op(e)}(n)||function(e){if("u">typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(n)||od(n)||function(){throw TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()),a=c[n.findIndex(function(e){return e===o})];a&&!a.disabled&&f(a.value)},300))}},c.map(function(e){var t=e.label,n=e.value,o=e.disabled,a=r.createElement("div",{className:"".concat(j,"-inner")},t);return r.createElement("li",{key:n,style:k.item,className:(0,r5.clsx)(j,S.item,ou(ou({},"".concat(j,"-selected"),u===n),"".concat(j,"-disabled"),o)),onClick:function(){o||f(n)},onDoubleClick:function(){!o&&h&&h()},onMouseEnter:function(){m(n)},onMouseLeave:function(){m(null)},"data-value":n},x?x(n,{prefixCls:b,originNode:a,today:v,type:"time",subType:p,locale:w}):a)}))}function om(){return(om=Object.assign.bind()).apply(this,arguments)}function oh(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||function(e,t){if(e){if("string"==typeof e)return og(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return og(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function og(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oy(e){var t=e.showHour,n=e.showMinute,o=e.showSecond,a=e.showMillisecond,i=e.use12Hours,l=e.changeOnScroll,s=n2(),c=s.prefixCls,u=s.classNames,d=s.styles,p=s.values,f=s.generateConfig,m=s.locale,h=s.onSelect,g=s.onHover,y=void 0===g?function(){}:g,b=s.pickerValue,x=(null==p?void 0:p[0])||null,v=r.useContext(n6).onCellDblClick,w=oh(nQ(f,e,x),5),S=w[0],k=w[1],j=w[2],$=w[3],C=w[4],T=function(e){return[x&&f[e](x),b&&f[e](b)]},M=oh(T("getHour"),2),N=M[0],E=M[1],I=oh(T("getMinute"),2),D=I[0],P=I[1],O=oh(T("getSecond"),2),z=O[0],A=O[1],R=oh(T("getMillisecond"),2),L=R[0],F=R[1],B=null===N?null:N<12?"am":"pm",H=r.useMemo(function(){return i?N<12?k.filter(function(e){return e.value<12}):k.filter(function(e){return!(e.value<12)}):k},[N,k,i]),W=function(e,t){var r,n=e.filter(function(e){return!e.disabled});return null!=t?t:null==n||null==(r=n[0])?void 0:r.value},U=W(k,N),Y=r.useMemo(function(){return j(U)},[j,U]),_=W(Y,D),V=r.useMemo(function(){return $(U,_)},[$,U,_]),q=W(V,z),K=r.useMemo(function(){return C(U,_,q)},[C,U,_,q]),X=W(K,L),G=r.useMemo(function(){if(!i)return[];var e=f.getNow(),t=f.setHour(e,6),r=f.setHour(e,18),n=function(e,t){var r=m.cellMeridiemFormat;return r?nL(e,{generateConfig:f,locale:m,format:r}):t};return[{label:n(t,"AM"),value:"am",disabled:k.every(function(e){return e.disabled||!(e.value<12)})},{label:n(r,"PM"),value:"pm",disabled:k.every(function(e){return e.disabled||e.value<12})}]},[k,i,f,m]),Q=function(e){h(S(e))},Z=r.useMemo(function(){var e=x||b||f.getNow(),t=function(e){return null!=e};return t(N)?(e=f.setHour(e,N),e=f.setMinute(e,D),e=f.setSecond(e,z),e=f.setMillisecond(e,L)):t(E)?(e=f.setHour(e,E),e=f.setMinute(e,P),e=f.setSecond(e,A),e=f.setMillisecond(e,F)):t(U)&&(e=f.setHour(e,U),e=f.setMinute(e,_),e=f.setSecond(e,q),e=f.setMillisecond(e,X)),e},[x,b,N,D,z,L,U,_,q,X,E,P,A,F,f]),J=function(e,t){return null===e?null:f[t](Z,e)},ee=function(e){return J(e,"setHour")},et=function(e){return J(e,"setMinute")},er=function(e){return J(e,"setSecond")},en=function(e){return J(e,"setMillisecond")},eo=function(e){return null===e?null:"am"!==e||N<12?"pm"===e&&N<12?f.setHour(Z,N+12):Z:f.setHour(Z,N-12)},ea={onDblClick:v,changeOnScroll:l};return r.createElement("div",{className:(0,r5.clsx)("".concat(c,"-content"),u.content),style:d.content},t&&r.createElement(of,om({units:H,value:N,optionalValue:E,type:"hour",onChange:function(e){Q(ee(e))},onHover:function(e){y(ee(e))}},ea)),n&&r.createElement(of,om({units:Y,value:D,optionalValue:P,type:"minute",onChange:function(e){Q(et(e))},onHover:function(e){y(et(e))}},ea)),o&&r.createElement(of,om({units:V,value:z,optionalValue:A,type:"second",onChange:function(e){Q(er(e))},onHover:function(e){y(er(e))}},ea)),a&&r.createElement(of,om({units:K,value:L,optionalValue:F,type:"millisecond",onChange:function(e){Q(en(e))},onHover:function(e){y(en(e))}},ea)),i&&r.createElement(of,om({units:G,value:B,type:"meridiem",onChange:function(e){Q(eo(e))},onHover:function(e){y(eo(e))}},ea)))}function ob(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function ox(e){var t,n=e.prefixCls,o=e.value,a=e.locale,i=e.generateConfig,l=e.showTime,s=(l||{}).format,c=(function(e){if(Array.isArray(e))return e}(t=n4(e,"time"))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return ob(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return ob(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0];return r.createElement(n1.Provider,{value:c},r.createElement("div",{className:(0,r5.clsx)("".concat(n,"-time-panel"))},r.createElement(ot,null,o?nL(o,{locale:a,format:s,generateConfig:i}):" "),r.createElement(oy,l)))}function ov(){return(ov=Object.assign.bind()).apply(this,arguments)}function ow(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oS(e){return(oS="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function ok(){return(ok=Object.assign.bind()).apply(this,arguments)}function oj(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function o$(e){return(o$="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oC(){return(oC=Object.assign.bind()).apply(this,arguments)}function oT(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oM(e){return(oM="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oN(){return(oN=Object.assign.bind()).apply(this,arguments)}function oE(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oI(e){return(oI="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oD(){return(oD=Object.assign.bind()).apply(this,arguments)}function oP(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oO(e){return(oO="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oz(){return(oz=Object.assign.bind()).apply(this,arguments)}function oA(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function oR(e){return(oR="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oL(){return(oL=Object.assign.bind()).apply(this,arguments)}function oF(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function oB(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?oF(Object(r),!0).forEach(function(t){oH(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):oF(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function oH(e,t,r){var n;return(n=function(e,t){if("object"!=oR(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oR(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==oR(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function oW(e){return function(e){if(Array.isArray(e))return o_(e)}(e)||function(e){if("u">typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||oY(e)||function(){throw TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function oU(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||oY(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function oY(e,t){if(e){if("string"==typeof e)return o_(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return o_(e,t)}}function o_(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}var oV={date:oi,datetime:function(e){var t,n=e.prefixCls,o=e.generateConfig,a=e.showTime,i=e.onSelect,l=e.value,s=e.pickerValue,c=e.onHover,u=(function(e){if(Array.isArray(e))return e}(t=nQ(o,a))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return ow(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return ow(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0],d=function(e){return l?nF(o,e,l):nF(o,e,s)};return r.createElement("div",{className:"".concat(n,"-datetime-panel")},r.createElement(oi,ov({},e,{onSelect:function(e){var t=d(e);i(u(t,t))},onHover:function(e){null==c||c(e?d(e):e)}})),r.createElement(ox,e))},week:function(e){var t=e.prefixCls,n=e.generateConfig,o=e.locale,a=e.value,i=e.hoverValue,l=e.hoverRangeValue,s=o.locale,c="".concat(t,"-week-panel-row");return r.createElement(oi,oD({},e,{mode:"week",panelName:"week",rowClassName:function(e){var t,r,o,u,d={};if(l){var p=function(e){if(Array.isArray(e))return e}(l)||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),2!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(l)||function(e){if(e){if("string"==typeof e)return oP(e,2);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oP(e,2)}}(l)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),f=p[0],m=p[1],h=nO(n,s,f,e),g=nO(n,s,m,e);d["".concat(c,"-range-start")]=h,d["".concat(c,"-range-end")]=g,d["".concat(c,"-range-hover")]=!h&&!g&&nA(n,f,m,e)}return i&&(d["".concat(c,"-hover")]=i.some(function(t){return nO(n,s,e,t)})),(0,r5.clsx)(c,(r={},o="".concat(c,"-selected"),u=!l&&nO(n,s,a,e),(t=function(e,t){if("object"!=oI(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oI(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(o,"string"),(o="symbol"==oI(t)?t:String(t))in r)?Object.defineProperty(r,o,{value:u,enumerable:!0,configurable:!0,writable:!0}):r[o]=u,r),d)}}))},month:function(e){var t,n=e.prefixCls,o=e.locale,a=e.generateConfig,i=e.pickerValue,l=e.disabledDate,s=e.onPickerValueChange,c=e.onModeChange,u="".concat(n,"-month-panel"),d=(function(e){if(Array.isArray(e))return e}(t=n4(e,"month"))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return oT(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oT(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0],p=a.setMonth(i,0),f=o.shortMonths||(a.locale.getShortMonths?a.locale.getShortMonths(o.locale):[]),m=l?function(e,t){var r=a.setDate(e,1),n=a.setMonth(r,a.getMonth(r)+1),o=a.addDate(n,-1);return l(r,t)&&l(o,t)}:null,h=r.createElement("button",{type:"button",key:"year","aria-label":o.yearSelect,onClick:function(){c("year")},tabIndex:-1,className:"".concat(n,"-year-btn")},nL(i,{locale:o,format:o.yearFormat,generateConfig:a}));return r.createElement(n1.Provider,{value:d},r.createElement("div",{className:u},r.createElement(ot,{superOffset:function(e){return a.addYear(i,e)},onChange:s,getStart:function(e){return a.setMonth(e,0)},getEnd:function(e){return a.setMonth(e,11)}},h),r.createElement(n7,oC({},e,{disabledDate:m,titleFormat:o.fieldMonthFormat,colNum:3,rowNum:4,baseDate:p,getCellDate:function(e,t){return a.addMonth(e,t)},getCellText:function(e){var t=a.getMonth(e);return o.monthFormat?nL(e,{locale:o,format:o.monthFormat,generateConfig:a}):f[t]},getCellClassName:function(){var e,t,r;return e={},t="".concat(n,"-cell-in-view"),(r=function(e,t){if("object"!=o$(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=o$(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==o$(r)?r:String(r))in e)?Object.defineProperty(e,t,{value:!0,enumerable:!0,configurable:!0,writable:!0}):e[t]=!0,e}}))))},quarter:function(e){var t,n=e.prefixCls,o=e.locale,a=e.generateConfig,i=e.pickerValue,l=e.onPickerValueChange,s=e.onModeChange,c="".concat(n,"-quarter-panel"),u=(function(e){if(Array.isArray(e))return e}(t=n4(e,"quarter"))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return oE(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oE(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0],d=a.setMonth(i,0),p=r.createElement("button",{type:"button",key:"year","aria-label":o.yearSelect,onClick:function(){s("year")},tabIndex:-1,className:"".concat(n,"-year-btn")},nL(i,{locale:o,format:o.yearFormat,generateConfig:a}));return r.createElement(n1.Provider,{value:u},r.createElement("div",{className:c},r.createElement(ot,{superOffset:function(e){return a.addYear(i,e)},onChange:l,getStart:function(e){return a.setMonth(e,0)},getEnd:function(e){return a.setMonth(e,11)}},p),r.createElement(n7,oN({},e,{titleFormat:o.fieldQuarterFormat,colNum:4,rowNum:1,baseDate:d,getCellDate:function(e,t){return a.addMonth(e,3*t)},getCellText:function(e){return nL(e,{locale:o,format:o.cellQuarterFormat,generateConfig:a})},getCellClassName:function(){var e,t,r;return e={},t="".concat(n,"-cell-in-view"),(r=function(e,t){if("object"!=oM(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oM(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==oM(r)?r:String(r))in e)?Object.defineProperty(e,t,{value:!0,enumerable:!0,configurable:!0,writable:!0}):e[t]=!0,e}}))))},year:function(e){var t,n=e.prefixCls,o=e.locale,a=e.generateConfig,i=e.pickerValue,l=e.disabledDate,s=e.onPickerValueChange,c=e.onModeChange,u="".concat(n,"-year-panel"),d=(function(e){if(Array.isArray(e))return e}(t=n4(e,"year"))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return oA(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oA(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0],p=function(e){var t=10*Math.floor(a.getYear(e)/10);return a.setYear(e,t)},f=function(e){var t=p(e);return a.addYear(t,9)},m=p(i),h=f(i),g=a.addYear(m,-1),y=l?function(e,t){var r=a.setMonth(e,0),n=a.setDate(r,1),o=a.addYear(n,1),i=a.addDate(o,-1);return l(n,t)&&l(i,t)}:null,b=r.createElement("button",{type:"button",key:"decade","aria-label":o.decadeSelect,onClick:function(){c("decade")},tabIndex:-1,className:"".concat(n,"-decade-btn")},nL(m,{locale:o,format:o.yearFormat,generateConfig:a}),"-",nL(h,{locale:o,format:o.yearFormat,generateConfig:a}));return r.createElement(n1.Provider,{value:d},r.createElement("div",{className:u},r.createElement(ot,{superOffset:function(e){return a.addYear(i,10*e)},onChange:s,getStart:p,getEnd:f},b),r.createElement(n7,oz({},e,{disabledDate:y,titleFormat:o.fieldYearFormat,colNum:3,rowNum:4,baseDate:g,getCellDate:function(e,t){return a.addYear(e,t)},getCellText:function(e){return nL(e,{locale:o,format:o.cellYearFormat,generateConfig:a})},getCellClassName:function(e){var t,r,o,i;return t={},r="".concat(n,"-cell-in-view"),o=nM(a,e,m)||nM(a,e,h)||nA(a,m,h,e),(i=function(e,t){if("object"!=oO(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oO(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(r,"string"),(r="symbol"==oO(i)?i:String(i))in t)?Object.defineProperty(t,r,{value:o,enumerable:!0,configurable:!0,writable:!0}):t[r]=o,t}}))))},decade:function(e){var t,n=e.prefixCls,o=e.locale,a=e.generateConfig,i=e.pickerValue,l=e.disabledDate,s=e.onPickerValueChange,c=(function(e){if(Array.isArray(e))return e}(t=n4(e,"decade"))||function(e){var t=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=t){var r,n,o,a,i=[],l=!0,s=!1;try{o=(t=t.call(e)).next,!1;for(;!(l=(r=o.call(t)).done)&&(i.push(r.value),1!==i.length);l=!0);}catch(e){s=!0,n=e}finally{try{if(!l&&null!=t.return&&(a=t.return(),Object(a)!==a))return}finally{if(s)throw n}}return i}}(t)||function(e){if(e){if("string"==typeof e)return oj(e,1);var t=Object.prototype.toString.call(e).slice(8,-1);if("Object"===t&&e.constructor&&(t=e.constructor.name),"Map"===t||"Set"===t)return Array.from(e);if("Arguments"===t||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t))return oj(e,1)}}(t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}())[0],u=function(e){var t=100*Math.floor(a.getYear(e)/100);return a.setYear(e,t)},d=function(e){var t=u(e);return a.addYear(t,99)},p=u(i),f=d(i),m=a.addYear(p,-10),h=l?function(e,t){var r=a.setDate(e,1),n=a.setMonth(r,0),o=a.setYear(n,10*Math.floor(a.getYear(n)/10)),i=a.addYear(o,10),s=a.addDate(i,-1);return l(o,t)&&l(s,t)}:null,g="".concat(nL(p,{locale:o,format:o.yearFormat,generateConfig:a}),"-").concat(nL(f,{locale:o,format:o.yearFormat,generateConfig:a}));return r.createElement(n1.Provider,{value:c},r.createElement("div",{className:"".concat(n,"-decade-panel")},r.createElement(ot,{superOffset:function(e){return a.addYear(i,100*e)},onChange:s,getStart:u,getEnd:d},g),r.createElement(n7,ok({},e,{disabledDate:h,colNum:3,rowNum:4,baseDate:m,getCellDate:function(e,t){return a.addYear(e,10*t)},getCellText:function(e){var t=o.cellYearFormat,r=nL(e,{locale:o,format:t,generateConfig:a}),n=nL(a.addYear(e,9),{locale:o,format:t,generateConfig:a});return"".concat(r,"-").concat(n)},getCellClassName:function(e){var t,r,o,i;return t={},r="".concat(n,"-cell-in-view"),o=nT(a,e,p)||nT(a,e,f)||nA(a,p,f,e),(i=function(e,t){if("object"!=oS(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oS(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(r,"string"),(r="symbol"==oS(i)?i:String(i))in t)?Object.defineProperty(t,r,{value:o,enumerable:!0,configurable:!0,writable:!0}):t[r]=o,t}}))))},time:ox},oq=r.memo(r.forwardRef(function(e,t){var n,o,a,i,l,s,c,u=e.classNames,d=e.styles,p=e.locale,f=e.generateConfig,m=e.direction,h=e.prefixCls,g=e.tabIndex,y=e.multiple,b=e.defaultValue,x=e.value,v=e.onChange,w=e.onSelect,S=e.defaultPickerValue,k=e.pickerValue,j=e.onPickerValueChange,$=e.mode,C=e.onPanelChange,T=e.picker,M=void 0===T?"date":T,N=e.showTime,E=e.hoverValue,I=e.hoverRangeValue,D=e.cellRender,P=e.dateRender,O=e.monthCellRender,z=e.components,A=e.hideHeader,R=r.useContext(nr)||{},L=R.prefixCls,F=R.classNames,B=R.styles,H=L||h||"rc-picker",W=r.useRef();r.useImperativeHandle(t,function(){return{nativeElement:W.current}});var U=oU(nj(e),4),Y=U[0],_=U[1],V=U[2],q=U[3],K=nm(p,_),X="date"===M&&N?"datetime":M,G=r.useMemo(function(){return n$(X,V,q,Y,K)},[X,V,q,Y,K]),Q=f.getNow(),Z=oU((0,r8.useControlledState)(M||"date",$),2),J=Z[0],ee=Z[1],et="date"===J&&G?"datetime":J,er=(n=f,o=p,a=X,function(e,t){var r=e.findIndex(function(e){return nz(n,o,e,t,a)});if(-1===r)return[].concat(nZ(e),[t]);var i=nZ(e);return i.splice(r,1),i}),en=oU((0,r8.useControlledState)(b,x),2),eo=en[0],ea=en[1],ei=r.useMemo(function(){var e=no(eo).filter(function(e){return e});return y?e:e.slice(0,1)},[eo,y]),el=(0,r3.useEvent)(function(e){ea(e),v&&(null===e||ei.length!==e.length||ei.some(function(t,r){return!nz(f,p,t,e[r],X)}))&&(null==v||v(y?e:e[0]))}),es=(0,r3.useEvent)(function(e){null==w||w(e),J===M&&el(y?er(ei,e):[e])}),ec=oU((0,r8.useControlledState)(S||ei[0]||Q,k),2),eu=ec[0],ed=ec[1];r.useEffect(function(){ei[0]&&!k&&ed(ei[0])},[ei[0]]);var ep=function(e,t){null==C||C(e||k,t||J)},ef=function(e){var t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];ed(e),null==j||j(e),t&&ep(e)},em=function(e,t){ee(e),t&&ef(t),ep(t,e)},eh=r.useMemo(function(){if(Array.isArray(I)){var e,t,r=oU(I,2);e=r[0],t=r[1]}else e=I;return e||t?(e=e||t,t=t||e,f.isAfter(e,t)?[t,e]:[e,t]):null},[I,f]),eg=(i=D,l=P,s=O,c=r.useMemo(function(){return i||function(e,t){return l&&"date"===t.type?l(e,t.today):s&&"month"===t.type?s(e,t.locale):t.originNode}},[i,s,l]),r.useCallback(function(e,t){return c(e,nc(nc({},t),{},{range:void 0}))},[c,void 0])),ey=(void 0===z?{}:z)[et]||oV[et]||oi,eb=r.useMemo(function(){var e,t,r,n;return{classNames:null!=(e=null!=(t=null==F?void 0:F.popup)?t:u)?e:{},styles:null!=(r=null!=(n=null==B?void 0:B.popup)?n:d)?r:{}}},[F,u,B,d]),ex=r.useContext(n6),ev=r.useMemo(function(){return oB(oB({},ex),{},{hideHeader:A})},[ex,A]),ew="".concat(H,"-panel"),eS=na(e,["showWeek","prevIcon","nextIcon","superPrevIcon","superNextIcon","disabledDate","minDate","maxDate","onHover"]);return r.createElement(n0.Provider,{value:eb},r.createElement(n6.Provider,{value:ev},r.createElement("div",{ref:W,tabIndex:void 0===g?0:g,className:(0,r5.clsx)(ew,oH({},"".concat(ew,"-rtl"),"rtl"===m))},r.createElement(ey,oL({},eS,{showTime:G,prefixCls:H,locale:K,generateConfig:f,onModeChange:em,pickerValue:eu,onPickerValueChange:function(e){ef(e,!0)},value:ei[0],onSelect:function(e){if(es(e),ef(e),J!==M){var t=["decade","year"],r=[].concat(t,["month"]),n={quarter:[].concat(t,["quarter"]),week:[].concat(oW(r),["week"]),date:[].concat(oW(r),["date"])}[M]||r,o=n.indexOf(J),a=n[o+1];a&&em(a,e)}},values:ei,cellRender:eg,hoverRangeValue:eh,hoverValue:E})))))}));function oK(e){return(oK="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function oX(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function oG(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?oX(Object(r),!0).forEach(function(t){var n,o,a;n=e,o=t,a=r[t],(o=function(e){var t=function(e,t){if("object"!=oK(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=oK(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==oK(t)?t:String(t)}(o))in n?Object.defineProperty(n,o,{value:a,enumerable:!0,configurable:!0,writable:!0}):n[o]=a}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):oX(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function oQ(e,t){var n=e.format,o=e.maskFormat,a=e.generateConfig,i=e.locale,l=e.preserveInvalidOnBlur,s=e.inputReadOnly,c=e.required,u=e["aria-required"],d=e.onSubmit,p=e.onFocus,f=e.onBlur,m=e.onInputChange,h=e.onInvalid,g=e.open,y=e.onOpenChange,b=e.onKeyDown,x=e.onChange,v=e.activeHelp,w=e.name,S=e.autoComplete,k=e.id,j=e.value,$=e.invalid,C=e.placeholder,T=e.disabled,M=e.activeIndex,N=e.allHelp,E=e.picker,I=function(e,t){var r=a.locale.parse(i.locale,e,[t]);return r&&a.isValidate(r)?r:null},D=n[0],P=r.useCallback(function(e){return nL(e,{locale:i,format:D,generateConfig:a})},[i,a,D]),O=r.useMemo(function(){return j.map(P)},[j,P]),z=r.useMemo(function(){return Math.max("time"===E?8:10,"function"==typeof D?D(a.getNow()).length:D.length)+2},[D,E,a]),A=function(e){for(var t=0;t<n.length;t+=1){var r=n[t];if("string"==typeof r){var o=I(e,r);if(o)return o}}return!1};return[function(r){function n(e){return void 0!==r?e[r]:e}var a=oG(oG({},(0,r7.default)(e,{aria:!0,data:!0})),{},{format:o,validateFormat:function(e){return!!A(e)},preserveInvalidOnBlur:l,readOnly:s,required:c,"aria-required":u,name:w,autoComplete:S,size:z,id:n(k),value:n(O)||"",invalid:n($),placeholder:n(C),active:M===r,helped:N||v&&M===r,disabled:n(T),onFocus:function(e){p(e,r)},onBlur:function(e){f(e,r)},onSubmit:d,onChange:function(e){m();var t=A(e);if(t){h(!1,r),x(t,r);return}h(!!e,r)},onHelp:function(){y(!0,{index:r})},onKeyDown:function(e){var t=!1;if(null==b||b(e,function(){t=!0}),!e.defaultPrevented&&!t)switch(e.key){case"Escape":y(!1,{index:r});break;case"Enter":g||y(!0)}}},null==t?void 0:t({valueTexts:O}));return Object.keys(a).forEach(function(e){void 0===a[e]&&delete a[e]}),a},P]}var oZ=["onMouseEnter","onMouseLeave"];function oJ(e){return r.useMemo(function(){return na(e,oZ)},[e])}var o0=["icon","type"],o1=["onClear"];function o2(){return(o2=Object.assign.bind()).apply(this,arguments)}function o4(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],!(t.indexOf(r)>=0)&&Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}function o6(e){var t=e.icon,n=e.type,o=o4(e,o0),a=r.useContext(nr),i=a.prefixCls,l=a.classNames,s=a.styles;return t?r.createElement("span",o2({className:(0,r5.clsx)("".concat(i,"-").concat(n),l.suffix),style:s.suffix},o),t):null}function o3(e){var t=e.onClear,n=o4(e,o1);return r.createElement(o6,o2({},n,{type:"clear",role:"button",onMouseDown:function(e){e.preventDefault()},onClick:function(e){e.stopPropagation(),t()}}))}function o8(e){return(o8="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o5(e,t,r){return(t=o9(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function o9(e){var t=function(e,t){if("object"!=o8(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=o8(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==o8(t)?t:String(t)}var o7=["YYYY","MM","DD","HH","mm","ss","SSS"],ae=function(){var e;function t(e){if(!(this instanceof t))throw TypeError("Cannot call a class as a function");o5(this,"format",void 0),o5(this,"maskFormat",void 0),o5(this,"cells",void 0),o5(this,"maskCells",void 0),this.format=e;var r=RegExp(o7.map(function(e){return"(".concat(e,")")}).join("|"),"g");this.maskFormat=e.replace(r,function(e){return"顧".repeat(e.length)});var n=new RegExp("(".concat(o7.join("|"),")")),o=(e.split(n)||[]).filter(function(e){return e}),a=0;this.cells=o.map(function(e){var t=o7.includes(e),r=a,n=a+e.length;return a=n,{text:e,mask:t,start:r,end:n}}),this.maskCells=this.cells.filter(function(e){return e.mask})}return e=[{key:"getSelection",value:function(e){var t=this.maskCells[e]||{};return[t.start||0,t.end||0]}},{key:"match",value:function(e){for(var t=0;t<this.maskFormat.length;t+=1){var r=this.maskFormat[t],n=e[t];if(!n||"顧"!==r&&r!==n)return!1}return!0}},{key:"size",value:function(){return this.maskCells.length}},{key:"getMaskCellIndex",value:function(e){for(var t=Number.MAX_SAFE_INTEGER,r=0,n=0;n<this.maskCells.length;n+=1){var o=this.maskCells[n],a=o.start,i=o.end;if(e>=a&&e<=i)return n;var l=Math.min(Math.abs(e-a),Math.abs(e-i));l<t&&(t=l,r=n)}return r}}],function(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,o9(n.key),n)}}(t.prototype,e),Object.defineProperty(t,"prototype",{writable:!1}),t}();function at(e){return(at="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var ar=["className","active","showActiveCls","suffixIcon","format","validateFormat","onChange","onInput","helped","onHelp","onSubmit","onKeyDown","preserveInvalidOnBlur","invalid","clearIcon"];function an(){return(an=Object.assign.bind()).apply(this,arguments)}function ao(e,t,r){var n;return(n=function(e,t){if("object"!=at(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=at(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==at(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function aa(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||function(e,t){if(e){if("string"==typeof e)return ai(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return ai(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function ai(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}var al=r.forwardRef(function(e,t){var n=e.className,o=e.active,a=e.showActiveCls,i=e.suffixIcon,l=e.format,s=e.validateFormat,c=e.onChange,u=(e.onInput,e.helped),d=e.onHelp,p=e.onSubmit,f=e.onKeyDown,m=e.preserveInvalidOnBlur,h=void 0!==m&&m,g=e.invalid,y=e.clearIcon,b=function(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],!(t.indexOf(r)>=0)&&Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}(e,ar),x=e.value,v=e.onFocus,w=e.onBlur,S=e.onMouseUp,k=r.useContext(nr),j=k.prefixCls,$=k.input,C=k.classNames,T=k.styles,M="".concat(j,"-input"),N=aa(r.useState(!1),2),E=N[0],I=N[1],D=aa(r.useState(x),2),P=D[0],O=D[1],z=aa(r.useState(""),2),A=z[0],R=z[1],L=aa(r.useState(null),2),F=L[0],B=L[1],H=aa(r.useState(null),2),W=H[0],U=H[1],Y=P||"";r.useEffect(function(){O(x)},[x]);var _=r.useRef(null),V=r.useRef(null);r.useImperativeHandle(t,function(){return{nativeElement:_.current,inputElement:V.current,focus:function(e){V.current.focus(e)},blur:function(){V.current.blur()}}});var q=r.useMemo(function(){return new ae(l||"")},[l]),K=aa(r.useMemo(function(){return u?[0,0]:q.getSelection(F)},[q,F,u]),2),X=K[0],G=K[1],Q=function(e){e&&e!==l&&e!==x&&d()},Z=(0,r3.useEvent)(function(e){s(e)&&c(e),O(e),Q(e)}),J=r.useRef(!1),ee=function(e){w(e)};nH(o,function(){o||h||O(x)});var et=function(e){"Enter"===e.key&&s(Y)&&p(),null==f||f(e)},er=r.useRef();(0,r9.default)(function(){if(E&&l&&!J.current)return q.match(Y)?(V.current.setSelectionRange(X,G),er.current=(0,nB.default)(function(){V.current.setSelectionRange(X,G)}),function(){nB.default.cancel(er.current)}):void Z(l)},[q,l,E,Y,F,X,G,W,Z]);var en=l?{onFocus:function(e){I(!0),B(0),R(""),v(e)},onBlur:function(e){I(!1),ee(e)},onKeyDown:function(e){et(e);var t=e.key,r=null,n=null,o=G-X,a=l.slice(X,G),i=function(e){B(function(t){var r=t+e;return Math.min(r=Math.max(r,0),q.size()-1)})},s=function(e){var t=aa({YYYY:[0,9999,new Date().getFullYear()],MM:[1,12],DD:[1,31],HH:[0,23],mm:[0,59],ss:[0,59],SSS:[0,999]}[a],3),r=t[0],n=t[1],o=t[2],i=Number(Y.slice(X,G));if(isNaN(i))return String(o||(e>0?r:n));var l=n-r+1;return String(r+(l+(i+e)-r)%l)};switch(t){case"Backspace":case"Delete":r="",n=a;break;case"ArrowLeft":r="",i(-1);break;case"ArrowRight":r="",i(1);break;case"ArrowUp":r="",n=s(1);break;case"ArrowDown":r="",n=s(-1);break;default:isNaN(Number(t))||(n=r=A+t)}null!==r&&(R(r),r.length>=o&&(i(1),R(""))),null!==n&&Z((Y.slice(0,X)+nn(n,o)+Y.slice(G)).slice(0,l.length)),U({})},onMouseDown:function(){J.current=!0},onMouseUp:function(e){var t=e.target.selectionStart;B(q.getMaskCellIndex(t)),U({}),null==S||S(e),J.current=!1},onPaste:function(e){var t=e.clipboardData.getData("text");s(t)&&Z(t)}}:{};return r.createElement("div",{ref:_,className:(0,r5.clsx)(M,ao(ao({},"".concat(M,"-active"),o&&(void 0===a||a)),"".concat(M,"-placeholder"),u),n)},r.createElement(void 0===$?"input":$,an({ref:V,"aria-invalid":g,autoComplete:"off"},b,{onKeyDown:et,onBlur:ee},en,{value:Y,onChange:function(e){if(!l){var t=e.target.value;Q(t),O(t),c(t)}},className:C.input,style:T.input})),r.createElement(o6,{type:"suffix",icon:i}),y)}),as=["id","prefix","clearIcon","suffixIcon","separator","activeIndex","activeHelp","allHelp","focused","onFocus","onBlur","onKeyDown","locale","generateConfig","placeholder","className","style","onClick","onClear","value","onChange","onSubmit","onInputChange","format","maskFormat","preserveInvalidOnBlur","onInvalid","disabled","invalid","inputReadOnly","direction","onOpenChange","onActiveInfo","placement","onMouseDown","required","aria-required","autoFocus","tabIndex"],ac=["index"];function au(){return(au=Object.assign.bind()).apply(this,arguments)}function ad(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function ap(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?ad(Object(r),!0).forEach(function(t){af(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):ad(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function af(e,t,r){var n;return(n=function(e,t){if("object"!=ag(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=ag(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==ag(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function am(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r=null==e?null:"u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=r){var n,o,a,i,l=[],s=!0,c=!1;try{if(a=(r=r.call(e)).next,0===t){if(Object(r)!==r)return;s=!1}else for(;!(s=(n=a.call(r)).done)&&(l.push(n.value),l.length!==t);s=!0);}catch(e){c=!0,o=e}finally{try{if(!s&&null!=r.return&&(i=r.return(),Object(i)!==i))return}finally{if(c)throw o}}return l}}(e,t)||function(e,t){if(e){if("string"==typeof e)return ah(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return ah(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function ah(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}function ag(e){return(ag="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function ay(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],!(t.indexOf(r)>=0)&&Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}var ab=e.i(172073);function ax(e){var t=e.prefixCls,n=e.value,o=e.onRemove,a=e.removeIcon,i=void 0===a?"×":a,l=e.formatDate,s=e.disabled,c=e.maxTagCount,u=e.placeholder,d="".concat(t,"-selection");function p(e,t){return r.createElement("span",{className:(0,r5.clsx)("".concat(d,"-item")),title:"string"==typeof e?e:null},r.createElement("span",{className:"".concat(d,"-item-content")},e),!s&&t&&r.createElement("span",{onMouseDown:function(e){e.preventDefault()},onClick:t,className:"".concat(d,"-item-remove")},i))}return r.createElement("div",{className:"".concat(t,"-selector")},r.createElement(ab.default,{prefixCls:"".concat(d,"-overflow"),data:n,renderItem:function(e){return p(l(e),function(t){t&&t.stopPropagation(),o(e)})},renderRest:function(e){return p("+ ".concat(e.length," ..."))},itemKey:function(e){return l(e)},maxCount:c}),!n.length&&r.createElement("span",{className:"".concat(t,"-selection-placeholder")},u))}function av(e){return(av="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var aw=["id","open","prefix","clearIcon","suffixIcon","activeHelp","allHelp","focused","onFocus","onBlur","onKeyDown","locale","generateConfig","placeholder","className","style","onClick","onClear","internalPicker","value","onChange","onSubmit","onInputChange","multiple","maxTagCount","format","maskFormat","preserveInvalidOnBlur","onInvalid","disabled","invalid","inputReadOnly","direction","onOpenChange","onMouseDown","required","aria-required","autoFocus","tabIndex","removeIcon"];function aS(){return(aS=Object.assign.bind()).apply(this,arguments)}function ak(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,n)}return r}function aj(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?ak(Object(r),!0).forEach(function(t){a$(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):ak(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function a$(e,t,r){var n;return(n=function(e,t){if("object"!=av(e)||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=av(n))return n;throw TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(t,"string"),(t="symbol"==av(n)?n:String(n))in e)?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function aC(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=Array(t);r<t;r++)n[r]=e[r];return n}var aT=e.i(393065),aM=e.i(386636),aN=e.i(821214),aE=e.i(104203),aI=e.i(30113),aD=e.i(581516),aD=aD,aP=e.i(722543),aP=aP,aO=e.i(767037);function az(e){let{fullscreen:t,validRange:n,generateConfig:o,locale:a,prefixCls:i,value:l,onChange:s,divRef:c}=e,u=o.getYear(l||o.getNow()),d=u-10,p=d+20;n&&(d=o.getYear(n[0]),p=o.getYear(n[1])+1);let f=a&&"年"===a.year?"年":"",m=[];for(let e=d;e<p;e++)m.push({label:`${e}${f}`,value:e});return r.createElement(aO.default,{size:t?void 0:"small",options:m,value:u,className:`${i}-year-select`,onChange:e=>{let t=o.setYear(l,e);if(n){let[e,r]=n,a=o.getYear(t),i=o.getMonth(t);a===o.getYear(r)&&i>o.getMonth(r)&&(t=o.setMonth(t,o.getMonth(r))),a===o.getYear(e)&&i<o.getMonth(e)&&(t=o.setMonth(t,o.getMonth(e)))}s(t)},getPopupContainer:()=>c.current})}function aA(e){let{prefixCls:t,fullscreen:n,validRange:o,value:a,generateConfig:i,locale:l,onChange:s,divRef:c}=e,u=i.getMonth(a||i.getNow()),d=0,p=11;if(o){let[e,t]=o,r=i.getYear(a);i.getYear(t)===r&&(p=i.getMonth(t)),i.getYear(e)===r&&(d=i.getMonth(e))}let f=l.shortMonths||i.locale.getShortMonths(l.locale),m=[];for(let e=d;e<=p;e+=1)m.push({label:f[e],value:e});return r.createElement(aO.default,{size:n?void 0:"small",className:`${t}-month-select`,value:u,options:m,onChange:e=>{s(i.setMonth(a,e))},getPopupContainer:()=>c.current})}function aR(e){let{prefixCls:t,locale:n,mode:o,fullscreen:a,onModeChange:i}=e;return r.createElement(aP.default,{onChange:({target:{value:e}})=>{i(e)},value:o,size:a?void 0:"small",className:`${t}-mode-switch`},r.createElement(aD.default,{value:"month"},n.month),r.createElement(aD.default,{value:"year"},n.year))}let aL=function(e){let{prefixCls:t,fullscreen:n,mode:o,onChange:a,onModeChange:i,className:l,style:s}=e,c=r.useRef(null),u=(0,r.useContext)(aI.FormItemInputContext),d=(0,r.useMemo)(()=>({...u,isFormItemInput:!1}),[u]),p={...e,fullscreen:n,divRef:c};return r.createElement("div",{className:(0,r5.clsx)(`${t}-header`,l),style:s,ref:c},r.createElement(aI.FormItemInputContext.Provider,{value:d},r.createElement(az,{...p,onChange:e=>{a(e,"year")}}),"month"===o&&r.createElement(aA,{...p,onChange:e=>{a(e,"month")}})),r.createElement(aR,{...p,onModeChange:i}))};var aF=e.i(757608);e.i(116725);var aB=e.i(760141),aH=e.i(145241);e.i(712387),e.i(398343);var aW=e.i(313596),aU=e.i(427889),aY=e.i(63896);let a_=(0,aU.genStyleHooks)("Calendar",e=>{let t=`${e.componentCls}-calendar`;return(e=>{let{calendarCls:t,componentCls:r,fullBg:n,fullPanelBg:o,itemActiveBg:a}=e;return{[t]:{...(e=>{let{componentCls:t,pickerCellCls:r,pickerCellInnerCls:n,pickerYearMonthCellWidth:o,pickerControlIconSize:a,cellWidth:i,paddingSM:l,paddingXS:s,paddingXXS:c,colorBgContainer:u,lineWidth:d,lineType:p,borderRadiusLG:f,colorPrimary:m,colorTextHeading:h,colorSplit:g,pickerControlIconBorderWidth:y,colorIcon:b,textHeight:x,motionDurationMid:v,colorIconHover:w,fontWeightStrong:S,cellHeight:k,pickerCellPaddingVertical:j,colorTextDisabled:$,colorText:C,fontSize:T,motionDurationSlow:M,withoutTimeCellHeight:N,pickerQuarterPanelContentHeight:E,borderRadiusSM:I,colorTextLightSolid:D,cellHoverBg:P,timeColumnHeight:O,timeColumnWidth:z,timeCellHeight:A,controlItemBgActive:R,marginXXS:L,pickerDatePanelPaddingHorizontal:F,pickerControlIconMargin:B}=e;return{[t]:{"&-panel":{display:"inline-flex",flexDirection:"column",textAlign:"center",background:u,borderRadius:f,outline:"none","&-focused":{borderColor:m},"&-rtl":{[`${t}-prev-icon,
              ${t}-super-prev-icon`]:{transform:"rotate(45deg)"},[`${t}-next-icon,
              ${t}-super-next-icon`]:{transform:"rotate(-135deg)"},[`${t}-time-panel`]:{[`${t}-content`]:{direction:"ltr","> *":{direction:"rtl"}}}}},[`&-decade-panel,
        &-year-panel,
        &-quarter-panel,
        &-month-panel,
        &-week-panel,
        &-date-panel,
        &-time-panel`]:{display:"flex",flexDirection:"column",width:e.calc(i).mul(7).add(e.calc(F).mul(2)).equal()},"&-header":{display:"flex",padding:`0 ${(0,aB.unit)(s)}`,color:h,borderBottom:`${(0,aB.unit)(d)} ${p} ${g}`,"> *":{flex:"none"},button:{padding:0,color:b,lineHeight:(0,aB.unit)(x),background:"transparent",border:0,cursor:"pointer",transition:`color ${v}`,fontSize:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center","&:empty":{display:"none"}},"> button":{minWidth:"1.6em",fontSize:T,"&:hover":{color:w},"&:disabled":{opacity:.25,pointerEvents:"none"}},"&-view":{flex:"auto",fontWeight:S,lineHeight:(0,aB.unit)(x),"> button":{color:"inherit",fontWeight:"inherit",verticalAlign:"top","&:not(:first-child)":{marginInlineStart:s},"&:hover":{color:m}}}},[`&-prev-icon,
        &-next-icon,
        &-super-prev-icon,
        &-super-next-icon`]:{position:"relative",width:a,height:a,"&::before":{position:"absolute",top:0,insetInlineStart:0,width:a,height:a,border:"0 solid currentcolor",borderBlockStartWidth:y,borderInlineStartWidth:y,content:'""'}},[`&-super-prev-icon,
        &-super-next-icon`]:{"&::after":{position:"absolute",top:B,insetInlineStart:B,display:"inline-block",width:a,height:a,border:"0 solid currentcolor",borderBlockStartWidth:y,borderInlineStartWidth:y,content:'""'}},"&-prev-icon, &-super-prev-icon":{transform:"rotate(-45deg)"},"&-next-icon, &-super-next-icon":{transform:"rotate(135deg)"},"&-content":{width:"100%",tableLayout:"fixed",borderCollapse:"collapse","th, td":{position:"relative",minWidth:k,fontWeight:"normal"},th:{height:e.calc(k).add(e.calc(j).mul(2)).equal(),color:C,verticalAlign:"middle"}},"&-cell":{padding:`${(0,aB.unit)(j)} 0`,color:$,cursor:"pointer","&-in-view":{color:C},...(e=>{let{pickerCellCls:t,pickerCellInnerCls:r,cellHeight:n,borderRadiusSM:o,motionDurationMid:a,cellHoverBg:i,lineWidth:l,lineType:s,colorPrimary:c,cellActiveWithRangeBg:u,colorTextLightSolid:d,colorTextDisabled:p,cellBgDisabled:f,colorFillSecondary:m}=e;return{"&::before":{position:"absolute",top:"50%",insetInlineStart:0,insetInlineEnd:0,zIndex:1,height:n,transform:"translateY(-50%)",content:'""',pointerEvents:"none"},[r]:{position:"relative",zIndex:2,display:"inline-block",minWidth:n,height:n,lineHeight:(0,aB.unit)(n),borderRadius:o,transition:`background-color ${a}`},[`&:hover:not(${t}-in-view):not(${t}-disabled),
    &:hover:not(${t}-selected):not(${t}-range-start):not(${t}-range-end):not(${t}-disabled)`]:{[r]:{background:i}},[`&-in-view${t}-today ${r}`]:{"&::before":{position:"absolute",top:0,insetInlineEnd:0,bottom:0,insetInlineStart:0,zIndex:1,border:`${(0,aB.unit)(l)} ${s} ${c}`,borderRadius:o,content:'""'}},[`&-in-view${t}-in-range,
      &-in-view${t}-range-start,
      &-in-view${t}-range-end`]:{position:"relative",[`&:not(${t}-disabled):before`]:{background:u}},[`&-in-view${t}-selected,
      &-in-view${t}-range-start,
      &-in-view${t}-range-end`]:{[`&:not(${t}-disabled) ${r}`]:{color:d,background:c},[`&${t}-disabled ${r}`]:{background:m}},[`&-in-view${t}-range-start:not(${t}-disabled):before`]:{insetInlineStart:"50%"},[`&-in-view${t}-range-end:not(${t}-disabled):before`]:{insetInlineEnd:"50%"},[`&-in-view${t}-range-start:not(${t}-range-end) ${r}`]:{borderStartStartRadius:o,borderEndStartRadius:o,borderStartEndRadius:0,borderEndEndRadius:0},[`&-in-view${t}-range-end:not(${t}-range-start) ${r}`]:{borderStartStartRadius:0,borderEndStartRadius:0,borderStartEndRadius:o,borderEndEndRadius:o},"&-disabled":{color:p,cursor:"not-allowed",[r]:{background:"transparent"},"&::before":{background:f}},[`&-disabled${t}-today ${r}::before`]:{borderColor:p}}})(e)},[`&-decade-panel,
        &-year-panel,
        &-quarter-panel,
        &-month-panel`]:{[`${t}-content`]:{height:e.calc(N).mul(4).equal()},[n]:{padding:`0 ${(0,aB.unit)(s)}`}},"&-quarter-panel":{[`${t}-content`]:{height:E}},"&-decade-panel":{[n]:{padding:`0 ${(0,aB.unit)(e.calc(s).div(2).equal())}`},[`${t}-cell::before`]:{display:"none"}},[`&-year-panel,
        &-quarter-panel,
        &-month-panel`]:{[`${t}-body`]:{padding:`0 ${(0,aB.unit)(s)}`},[n]:{width:o}},"&-date-panel":{[`${t}-body`]:{padding:`${(0,aB.unit)(s)} ${(0,aB.unit)(F)}`},[`${t}-content th`]:{boxSizing:"border-box",padding:0}},"&-week-panel-row":{td:{"&:before":{transition:`background-color ${v}`},"&:first-child:before":{borderStartStartRadius:I,borderEndStartRadius:I},"&:last-child:before":{borderStartEndRadius:I,borderEndEndRadius:I}},"&:hover td:before":{background:P},"&-range-start td, &-range-end td, &-selected td, &-hover td":{[`&${r}`]:{"&:before":{background:m},[`&${t}-cell-week`]:{color:new aH.FastColor(D).setA(.5).toHexString()},[n]:{color:D}}},"&-range-hover td:before":{background:R}},"&-week-panel, &-date-panel-show-week":{[`${t}-body`]:{padding:`${(0,aB.unit)(s)} ${(0,aB.unit)(l)}`},[`${t}-content th`]:{width:"auto"}},"&-datetime-panel":{display:"flex",[`${t}-time-panel`]:{borderInlineStart:`${(0,aB.unit)(d)} ${p} ${g}`},[`${t}-date-panel,
          ${t}-time-panel`]:{transition:`opacity ${M}`},"&-active":{[`${t}-date-panel,
            ${t}-time-panel`]:{opacity:.3,"&-active":{opacity:1}}}},"&-time-panel":{width:"auto",minWidth:"auto",[`${t}-content`]:{display:"flex",flex:"auto",height:O},"&-column":{flex:"1 0 auto",width:z,margin:`${(0,aB.unit)(c)} 0`,padding:0,overflowY:"hidden",textAlign:"start",listStyle:"none",transition:`background-color ${v}`,overflowX:"hidden","&::-webkit-scrollbar":{width:8,backgroundColor:"transparent"},"&::-webkit-scrollbar-thumb":{backgroundColor:e.colorTextTertiary,borderRadius:e.borderRadiusSM},"&":{scrollbarWidth:"thin",scrollbarColor:`${e.colorTextTertiary} transparent`},"&::after":{display:"block",height:`calc(100% - ${(0,aB.unit)(A)})`,content:'""'},"&:not(:first-child)":{borderInlineStart:`${(0,aB.unit)(d)} ${p} ${g}`},"&-active":{background:new aH.FastColor(R).setA(.2).toHexString()},"&:hover":{overflowY:"auto"},"> li":{margin:0,padding:0,[`&${t}-time-panel-cell`]:{marginInline:L,[`${t}-time-panel-cell-inner`]:{display:"block",width:e.calc(z).sub(e.calc(L).mul(2)).equal(),height:A,margin:0,paddingBlock:0,paddingInlineEnd:0,paddingInlineStart:e.calc(z).sub(A).div(2).equal(),color:C,lineHeight:(0,aB.unit)(A),borderRadius:I,cursor:"pointer",transition:`background-color ${v}`,"&:hover":{background:P}},"&-selected":{[`${t}-time-panel-cell-inner`]:{background:R}},"&-disabled":{[`${t}-time-panel-cell-inner`]:{color:$,background:"transparent",cursor:"not-allowed"}}}}}}}}})(e),...(0,aW.resetComponent)(e),background:n,"&-rtl":{direction:"rtl"},[`${t}-header`]:{display:"flex",justifyContent:"flex-end",padding:`${(0,aB.unit)(e.paddingSM)} 0`,[`${t}-year-select`]:{minWidth:e.yearControlWidth},[`${t}-month-select`]:{minWidth:e.monthControlWidth,marginInlineStart:e.marginXS},[`${t}-mode-switch`]:{marginInlineStart:e.marginXS}}},[`${t} ${r}-panel`]:{background:o,border:0,borderTop:`${(0,aB.unit)(e.lineWidth)} ${e.lineType} ${e.colorSplit}`,borderRadius:0,[`${r}-month-panel, ${r}-date-panel`]:{width:"auto"},[`${r}-body`]:{padding:`${(0,aB.unit)(e.paddingXS)} 0`},[`${r}-content`]:{width:"100%"}},[`${t}-mini`]:{borderRadius:e.borderRadiusLG,[`${t}-header`]:{paddingInlineEnd:e.paddingXS,paddingInlineStart:e.paddingXS},[`${r}-panel`]:{borderRadius:`0 0 ${(0,aB.unit)(e.borderRadiusLG)} ${(0,aB.unit)(e.borderRadiusLG)}`},[`${r}-content`]:{height:e.miniContentHeight,th:{height:"auto",padding:0,lineHeight:(0,aB.unit)(e.weekHeight)}},[`${r}-cell::before`]:{pointerEvents:"none"}},[`${t}${t}-full`]:{[`${r}-panel`]:{display:"block",width:"100%",textAlign:"end",background:n,border:0,[`${r}-body`]:{"th, td":{padding:0},th:{height:"auto",paddingInlineEnd:e.paddingSM,paddingBottom:e.paddingXXS,lineHeight:(0,aB.unit)(e.weekHeight)}}},[`${r}-cell-week ${r}-cell-inner`]:{display:"block",borderRadius:0,borderTop:`${(0,aB.unit)(e.lineWidthBold)} ${e.lineType} ${e.colorSplit}`,width:"100%",height:e.calc(e.dateValueHeight).add(e.dateContentHeight).add(e.calc(e.paddingXS).div(2)).add(e.lineWidthBold).equal()},[`${r}-cell`]:{"&::before":{display:"none"},"&:hover":{[`${t}-date`]:{background:e.controlItemBgHover}},[`${t}-date-today::before`]:{display:"none"},[`&-in-view${r}-cell-selected`]:{[`${t}-date, ${t}-date-today`]:{background:a}},"&-selected, &-selected:hover":{[`${t}-date, ${t}-date-today`]:{[`${t}-date-value`]:{color:e.colorPrimary}}}},[`${t}-date`]:{display:"block",width:"auto",height:"auto",margin:`0 ${(0,aB.unit)(e.calc(e.marginXS).div(2).equal())}`,padding:`${(0,aB.unit)(e.calc(e.paddingXS).div(2).equal())} ${(0,aB.unit)(e.paddingXS)} 0`,border:0,borderTop:`${(0,aB.unit)(e.lineWidthBold)} ${e.lineType} ${e.colorSplit}`,borderRadius:0,transition:`background-color ${e.motionDurationSlow}`,"&-value":{lineHeight:(0,aB.unit)(e.dateValueHeight),transition:`color ${e.motionDurationSlow}`},"&-content":{position:"static",width:"auto",height:e.dateContentHeight,overflowY:"auto",color:e.colorText,lineHeight:e.lineHeight,textAlign:"start"},"&-today":{borderColor:e.colorPrimary,[`${t}-date-value`]:{color:e.colorText}}}},[`@media only screen and (max-width: ${(0,aB.unit)(e.screenXS)}) `]:{[t]:{[`${t}-header`]:{display:"block",[`${t}-year-select`]:{width:"50%"},[`${t}-month-select`]:{width:`calc(50% - ${(0,aB.unit)(e.paddingXS)})`},[`${t}-mode-switch`]:{width:"100%",marginTop:e.marginXS,marginInlineStart:0,"> label":{width:"50%",textAlign:"center"}}}}}}})((0,aY.mergeToken)(e,(e=>{let{componentCls:t,controlHeightLG:r,paddingXXS:n,padding:o}=e;return{pickerCellCls:`${t}-cell`,pickerCellInnerCls:`${t}-cell-inner`,pickerYearMonthCellWidth:e.calc(r).mul(1.5).equal(),pickerQuarterPanelContentHeight:e.calc(r).mul(1.4).equal(),pickerCellPaddingVertical:e.calc(n).add(e.calc(n).div(2)).equal(),pickerCellBorderGap:2,pickerControlIconSize:7,pickerControlIconMargin:4,pickerControlIconBorderWidth:1.5,pickerDatePanelPaddingHorizontal:e.calc(o).add(e.calc(n).div(2)).equal()}})(e),{calendarCls:t,pickerCellInnerCls:`${e.componentCls}-cell-inner`,dateValueHeight:e.controlHeightSM,weekHeight:e.calc(e.controlHeightSM).mul(.75).equal(),dateContentHeight:e.calc(e.calc(e.fontHeightSM).add(e.marginXS)).mul(3).add(e.calc(e.lineWidth).mul(2)).equal()}))},e=>({fullBg:e.colorBgContainer,fullPanelBg:e.colorBgContainer,itemActiveBg:e.controlItemBgActive,yearControlWidth:80,monthControlWidth:70,miniContentHeight:256,...(e=>{let{colorBgContainerDisabled:t,controlHeight:r,controlHeightSM:n,controlHeightLG:o,paddingXXS:a,lineWidth:i}=e,l=2*a,s=2*i,c=Math.min(r-l,r-s),u=Math.min(n-l,n-s),d=Math.min(o-l,o-s);return{INTERNAL_FIXED_ITEM_MARGIN:Math.floor(a/2),cellHoverBg:e.controlItemBgHover,cellActiveWithRangeBg:e.controlItemBgActive,cellHoverWithRangeBg:new aH.FastColor(e.colorPrimary).lighten(35).toHexString(),cellRangeBorderColor:new aH.FastColor(e.colorPrimary).lighten(20).toHexString(),cellBgDisabled:t,timeColumnWidth:1.4*o,timeColumnHeight:224,timeCellHeight:28,cellWidth:1.5*n,cellHeight:n,textHeight:o,withoutTimeCellHeight:1.65*o,multipleItemBg:e.colorFillSecondary,multipleItemBorderColor:"transparent",multipleItemHeight:c,multipleItemHeightSM:u,multipleItemHeightLG:d,multipleSelectorBgDisabled:t,multipleItemColorDisabled:e.colorTextDisabled,multipleItemBorderColorDisabled:"transparent"}})(e)})),aV=(e,t,r)=>{let{getYear:n}=r;return e&&t&&n(e)===n(t)},aq=(e,t,r)=>{let{getMonth:n}=r;return aV(e,t,r)&&n(e)===n(t)},aK=(e,t,r)=>{let{getDate:n}=r;return aq(e,t,r)&&n(e)===n(t)},aX=e=>t=>{let{prefixCls:n,className:o,rootClassName:a,style:i,dateFullCellRender:l,dateCellRender:s,monthFullCellRender:c,monthCellRender:u,cellRender:d,fullCellRender:p,headerRender:f,value:m,defaultValue:h,disabledDate:g,mode:y,validRange:b,fullscreen:x=!0,showWeek:v,onChange:w,onPanelChange:S,onSelect:k,styles:j,classNames:$}=t,{getPrefixCls:C,direction:T,className:M,style:N,classNames:E,styles:I}=(0,aN.useComponentConfig)("calendar"),D={...t,mode:y,fullscreen:x,showWeek:v},[P,O]=(0,aM.useMergeSemantic)([E,$],[I,j],{props:D}),[z,A,R,L,F,B]=r.useMemo(()=>{let{root:e,header:t,...r}=P,{root:n,header:o,...a}=O;return[e,t,r,n,o,a]},[P,O]),H=C("picker",n),W=`${H}-calendar`,[U,Y]=a_(H,W),_=e.getNow(),[V,q]=(0,r8.useControlledState)(()=>h||e.getNow(),m),[K,X]=(0,r8.useControlledState)("month",y),G=r.useMemo(()=>"year"===K?"month":"date",[K]),Q=r.useCallback(t=>!!b&&(e.isAfter(b[0],t)||e.isAfter(t,b[1]))||!!g?.(t),[g,b]),Z=(e,t)=>{S?.(e,t)},J=e=>{X(e),Z(V,e)},ee=(t,r)=>{q(t),aK(t,V,e)||(("date"!==G||aq(t,V,e))&&("month"!==G||aV(t,V,e))||Z(t,K),w?.(t)),k?.(t,{source:r})},et=r.useCallback((t,n)=>p?p(t,n):l?l(t):r.createElement("div",{className:(0,r5.clsx)(`${H}-cell-inner`,`${W}-date`,{[`${W}-date-today`]:aK(_,t,e)})},r.createElement("div",{className:`${W}-date-value`},String(e.getDate(t)).padStart(2,"0")),r.createElement("div",{className:`${W}-date-content`},"function"==typeof d?d(t,n):s?.(t))),[_,H,W,p,l,d,s]),er=r.useCallback((t,n)=>{if(p)return p(t,n);if(c)return c(t);let o=n.locale.shortMonths||e.locale.getShortMonths(n.locale.locale);return r.createElement("div",{className:(0,r5.clsx)(`${H}-cell-inner`,`${W}-date`,{[`${W}-date-today`]:aq(_,t,e)})},r.createElement("div",{className:`${W}-date-value`},o[e.getMonth(t)]),r.createElement("div",{className:`${W}-date-content`},"function"==typeof d?d(t,n):u?.(t)))},[_,H,W,p,c,d,u]),[en]=(0,aE.useLocale)("Calendar",aF.default),eo=(0,aT.merge)(en,t.locale||{});return r.createElement("div",{className:(0,r5.clsx)(W,{[`${W}-full`]:x,[`${W}-mini`]:!x,[`${W}-rtl`]:"rtl"===T},M,o,a,z,U,Y),style:{...L,...N,...i}},f?f({value:V,type:K,onChange:e=>{ee(e,"customize")},onTypeChange:J}):r.createElement(aL,{className:A,style:F,prefixCls:W,value:V,generateConfig:e,mode:K,fullscreen:x,locale:eo?.lang,validRange:b,onChange:ee,onModeChange:J}),r.createElement(oq,{classNames:R,styles:B,value:V,prefixCls:H,locale:eo?.lang,generateConfig:e,cellRender:(e,t)=>"date"===t.type?et(e,t):"month"===t.type?er(e,{...t,locale:eo?.lang}):void 0,onSelect:e=>{ee(e,G)},mode:G,picker:G,disabledDate:Q,hideHeader:!0,showWeek:v}))},aG=aX({getNow:function(){var e=(0,rX.default)();return"function"==typeof e.tz?e.tz():e},getFixedDate:function(e){return(0,rX.default)(e,["YYYY-M-DD","YYYY-MM-DD"])},getEndDate:function(e){return e.endOf("month")},getWeekDay:function(e){var t=e.locale("en");return t.weekday()+t.localeData().firstDayOfWeek()},getYear:function(e){return e.year()},getMonth:function(e){return e.month()},getDate:function(e){return e.date()},getHour:function(e){return e.hour()},getMinute:function(e){return e.minute()},getSecond:function(e){return e.second()},getMillisecond:function(e){return e.millisecond()},addYear:function(e,t){return e.add(t,"year")},addMonth:function(e,t){return e.add(t,"month")},addDate:function(e,t){return e.add(t,"day")},setYear:function(e,t){return e.year(t)},setMonth:function(e,t){return e.month(t)},setDate:function(e,t){return e.date(t)},setHour:function(e,t){return e.hour(t)},setMinute:function(e,t){return e.minute(t)},setSecond:function(e,t){return e.second(t)},setMillisecond:function(e,t){return e.millisecond(t)},isAfter:function(e,t){return e.isAfter(t)},isValidate:function(e){return e.isValid()},locale:{getWeekFirstDay:function(e){return(0,rX.default)().locale(r4(e)).localeData().firstDayOfWeek()},getWeekFirstDate:function(e,t){return t.locale(r4(e)).weekday(0)},getWeek:function(e,t){return t.locale(r4(e)).week()},getShortWeekDays:function(e){return(0,rX.default)().locale(r4(e)).localeData().weekdaysMin()},getShortMonths:function(e){return(0,rX.default)().locale(r4(e)).localeData().monthsShort()},format:function(e,t,r){return t.locale(r4(e)).format(r)},parse:function(e,t,r){for(var n=r4(e),o=0;o<r.length;o+=1){var a=r[o];if(a.includes("wo")||a.includes("Wo")){for(var i=t.split("-")[0],l=t.split("-")[1],s=(0,rX.default)(i,"YYYY").startOf("year").locale(n),c=0;c<=52;c+=1){var u=s.add(c,"week");if(u.format("Wo")===l)return u}return r6(),null}var d=(0,rX.default)(t,a,!0).locale(n);if(d.isValid())return d}return t&&r6(),null}}});aG.generateCalendar=aX;var aQ=e.i(900990),aZ=e.i(772445);let aJ=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        flex-direction: column;
        height: 100%;
        background: ${t.colorBgContainer};
        color: ${t.colorText};
        overflow: hidden;
    `,header:e`
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,dateNav:e`
        display: flex;
        align-items: center;
        gap: 12px;
    `,todayBtn:e`
        font-size: 13px;
        font-weight: 500;
        padding: 6px 16px;
        border: 1px solid ${t.colorBorder};
        border-radius: 6px;
        cursor: pointer;
        background: transparent;
        transition: all 0.2s;
        &:hover {
            background: ${t.colorFillTertiary};
            border-color: ${t.colorTextQuaternary};
        }
    `,dateRange:e`
        font-size: 18px;
        font-weight: 600;
        margin-left: 8px;
    `,topActions:e`
        display: flex;
        align-items: center;
        gap: 8px;
    `,weeklyRow:e`
        display: flex;
        padding: 16px 20px;
        gap: 12px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
    `,dayCard:e`
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
        background: ${t.colorFillAlter};
        border-radius: 12px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        &:hover {
            background: ${t.colorFillSecondary};
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &.active {
            background: ${t.colorBgContainer};
            border-color: ${t.colorPrimary};
            box-shadow: 0 6px 16px ${t.colorPrimary}20;
            
            .day-border {
                width: 40px;
                height: 3px;
                background: ${t.colorPrimary};
                border-radius: 2px;
                margin-top: 4px;
                box-shadow: 0 0 10px ${t.colorPrimary}80;
            }
        }
    `,dayHeader:e`
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    `,dayNameAndNum:e`
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.01em;
    `,dayStats:e`
        display: flex;
        flex-direction: column;
        gap: 6px;
    `,statItem:e`
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: ${t.colorTextDescription};
        padding: 2px 0;
        
        span:last-child {
            font-weight: 700;
            color: ${t.colorText};
        }
    `,filterBar:e`
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    `,filterTab:e`
        padding: 8px 18px;
        border-radius: 10px;
        background: ${t.colorFillSecondary};
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;

        &:hover {
            background: ${t.colorFillTertiary};
        }

        &.active {
            background: ${t.colorBgContainer};
            color: ${t.colorPrimary};
            border-color: ${t.colorPrimary}40;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
    `,legendRow:e`
        padding: 8px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: ${t.colorFillAlter};
    `,categorySelect:e`
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: ${t.colorTextSecondary};
        cursor: pointer;
    `,tableContainer:e`
        flex: 1;
        overflow-y: auto;
    `,table:e`
        width: 100%;
        border-collapse: collapse;
        
        th {
            text-align: left;
            padding: 12px 20px;
            font-size: 11px;
            color: ${t.colorTextQuaternary};
            text-transform: uppercase;
            border-bottom: 1px solid ${t.colorBorderSecondary};
        }

        td {
            padding: 12px 20px;
            font-size: 14px;
            border-bottom: 1px solid ${t.colorBorderSecondary}40;
        }
    `,groupHeader:e`
        background: ${t.colorFillTertiary}40;
        td {
            font-size: 12px;
            font-weight: 600;
            padding: 8px 20px;
        }
    `,timeCell:e`
        white-space: nowrap;
        color: ${t.colorTextSecondary};
        font-family: monospace;
    `,eventCell:e`
        display: flex;
        align-items: center;
        gap: 12px;
    `,countdownCell:e`
        color: ${a.RED};
        font-size: 11px;
    `,calendarPopup:e`
        width: 300px;
        .ant-picker-calendar-date-selected {
            .ant-picker-calendar-date-value {
                color: #000 !important;
            }
        }
    `,countryListItem:e`
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        &:hover {
            background: ${t.colorFillTertiary};
        }
    `,countryList:e`
        max-height: 250px;
        overflow-y: auto;
        width: 200px;
        padding: 4px;
    `,utcButton:e`
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
        &:hover {
            background: ${t.colorFillTertiary};
        }
    `})),a0=[{code:"US"},{code:"EU"},{code:"DE"},{code:"UK"},{code:"JP"},{code:"CA"},{code:"AU"},{code:"CH"},{code:"CN"},{code:"BR"},{code:"MX"},{code:"IN"},{code:"TR"},{code:"KR"},{code:"RU"},{code:"ZA"},{code:"AR"},{code:"SA"},{code:"ID"},{code:"FR"},{code:"IT"}],a1=({country:e})=>(0,t.jsx)(rH,{countryCode:e,svg:!0,style:{width:"1.5em",height:"1.1em",borderRadius:"2px",objectFit:"cover"},title:e}),a2=()=>{let{t:e}=(0,n.useTranslation)("workspace"),{styles:o,cx:a}=aJ(),{setCalendarOpen:i}=ep(),[l,s]=(0,r.useState)("Economic"),c=(0,t.jsx)(aQ.ConfigProvider,{locale:aZ.default,theme:{token:{colorPrimary:"#fff"}},children:(0,t.jsx)("div",{className:o.calendarPopup,children:(0,t.jsx)(aG,{fullscreen:!1})})});return o.countryList,e("economicCalendar.timezoneAndCountries"),o.countryListItem,a0.map(r=>(0,t.jsxs)("div",{className:o.countryListItem,children:[(0,t.jsx)(a1,{country:r.code}),(0,t.jsx)("span",{style:{fontSize:13},children:e(`economicCalendar.countries.${r.code}`)})]},r.code)),(0,t.jsxs)("div",{className:o.container,children:[(0,t.jsxs)("div",{className:o.header,children:[(0,t.jsxs)("div",{className:o.dateNav,children:[(0,t.jsx)("div",{className:o.todayBtn,children:e("economicCalendar.today")}),(0,t.jsx)(rK.Popover,{content:c,trigger:"click",placement:"bottomLeft",children:(0,t.jsx)(r_.Button,{icon:(0,t.jsx)(rW,{size:16}),style:{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}})}),(0,t.jsx)(tY.ChevronLeft,{size:20,cursor:"pointer"}),(0,t.jsx)(u.ChevronRight,{size:20,cursor:"pointer"}),(0,t.jsx)("span",{className:o.dateRange,children:"Feb 9 — Feb 15, 2026"})]}),(0,t.jsxs)("div",{className:o.topActions,children:[(0,t.jsx)(rq.Tooltip,{title:e("economicCalendar.yieldCurve"),children:(0,t.jsx)(rU,{size:20,cursor:"pointer"})}),(0,t.jsx)(eb.X,{size:24,cursor:"pointer",onClick:()=>i(!1)})]})]}),(0,t.jsx)("div",{className:o.weeklyRow,children:[{name:"Mon",date:"9",active:!1,stats:{Economic:36,Earnings:800,Dividends:599}},{name:"Tue",date:"10",active:!0,stats:{Economic:50,Earnings:1912,Dividends:291}},{name:"Wed",date:"11",active:!1,stats:{Economic:61,Earnings:1480,Dividends:252}},{name:"Thu",date:"12",active:!1,stats:{Economic:57,Earnings:2991,Dividends:402,IPO:2}},{name:"Fri",date:"13",active:!1,stats:{Economic:42,Earnings:2272,Dividends:1088,IPO:2}},{name:"Sat",date:"14",active:!1,stats:{Economic:1,Earnings:54}},{name:"Sun",date:"15",active:!1,stats:{Economic:4,Dividends:1}}].map(r=>(0,t.jsxs)("div",{className:a(o.dayCard,r.active&&"active"),children:[(0,t.jsx)("div",{className:o.dayHeader,children:(0,t.jsxs)("div",{className:o.dayNameAndNum,children:[e(`economicCalendar.days.${r.name}`)," ",r.date,r.active&&(0,t.jsx)("div",{className:"day-border"})]})}),(0,t.jsxs)("div",{className:o.dayStats,children:[r.stats.Economic&&(0,t.jsxs)("div",{className:o.statItem,children:[(0,t.jsx)("span",{children:e("economicCalendar.categories.Economic")}),(0,t.jsx)("span",{children:r.stats.Economic})]}),r.stats.Earnings&&(0,t.jsxs)("div",{className:o.statItem,children:[(0,t.jsx)("span",{children:e("economicCalendar.categories.Earnings")}),(0,t.jsx)("span",{children:r.stats.Earnings})]}),r.stats.Dividends&&(0,t.jsxs)("div",{className:o.statItem,children:[(0,t.jsx)("span",{children:e("economicCalendar.categories.Dividends")}),(0,t.jsx)("span",{children:r.stats.Dividends})]}),r.stats.IPO&&(0,t.jsxs)("div",{className:o.statItem,children:[(0,t.jsx)("span",{children:e("economicCalendar.categories.IPO")}),(0,t.jsx)("span",{children:r.stats.IPO})]})]})]},r.date))}),(0,t.jsx)("div",{className:o.filterBar,children:["Economic","Earnings","Revenue","Dividends","IPO"].map(r=>(0,t.jsx)("div",{className:a(o.filterTab,l===r&&"active"),onClick:()=>s(r),children:e(`economicCalendar.categories.${r}`)},r))}),(0,t.jsx)("div",{className:o.tableContainer,children:(0,t.jsxs)("table",{className:o.table,children:[(0,t.jsx)("thead",{children:(0,t.jsxs)("tr",{children:[(0,t.jsx)("th",{style:{width:100},children:e("economicCalendar.table.time")}),(0,t.jsx)("th",{children:e("economicCalendar.table.event")}),(0,t.jsx)("th",{style:{width:100},children:e("economicCalendar.table.actual")}),(0,t.jsx)("th",{style:{width:100},children:e("economicCalendar.table.forecast")}),(0,t.jsx)("th",{style:{width:100},children:e("economicCalendar.table.prior")})]})}),(0,t.jsxs)("tbody",{children:[(0,t.jsx)("tr",{className:o.groupHeader,children:(0,t.jsx)("td",{colSpan:5,children:"Tuesday, February 10"})}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{children:(0,t.jsx)(rV.Tag,{color:"red",bordered:!1,style:{margin:0,fontWeight:600},children:"13:30"})}),(0,t.jsx)("td",{children:(0,t.jsxs)("div",{className:o.eventCell,children:[(0,t.jsx)(a1,{country:"DE"}),(0,t.jsx)(rY.Activity,{size:14,color:"#52c41a"}),(0,t.jsx)("span",{children:"5-Year Bobl Auction"}),(0,t.jsx)("span",{className:o.countdownCell,children:e("economicCalendar.comingIn",{time:"04:38"})})]})}),(0,t.jsx)("td",{}),(0,t.jsx)("td",{}),(0,t.jsx)("td",{style:{textAlign:"right"},children:"2.47%"})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{className:o.timeCell,children:"14:00"}),(0,t.jsx)("td",{children:(0,t.jsxs)("div",{className:o.eventCell,children:[(0,t.jsx)(a1,{country:"US"}),(0,t.jsx)(rY.Activity,{size:14,color:"#52c41a"}),(0,t.jsx)("span",{children:"NFIB Business Optimism Index"})]})}),(0,t.jsx)("td",{style:{fontWeight:600},children:"99.9"}),(0,t.jsx)("td",{}),(0,t.jsx)("td",{style:{textAlign:"right"},children:"99.5"})]}),(0,t.jsxs)("tr",{children:[(0,t.jsx)("td",{className:o.timeCell,children:"16:15"}),(0,t.jsx)("td",{children:(0,t.jsxs)("div",{className:o.eventCell,children:[(0,t.jsx)(a1,{country:"US"}),(0,t.jsx)(rY.Activity,{size:14,color:"#52c41a"}),(0,t.jsx)("span",{children:"ADP Employment Change Weekly"})]})}),(0,t.jsx)("td",{}),(0,t.jsx)("td",{}),(0,t.jsx)("td",{style:{textAlign:"right"},children:"7.75 K"})]})]})]})})]})},a4=(0,o.createStyles)(({css:e,token:t})=>({overlay:e`
        position: absolute;
        top: 0;
        right: 56px;
        bottom: 0;
        width: calc(100% - 112px); 
        z-index: 1001; 
        pointer-events: none;
        display: flex;
        justify-content: flex-end;
    `,panel:e`
        pointer-events: auto;
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
        background: ${t.colorBgContainer};
        height: 100% !important;
        
        > div {
             height: 100% !important;
        }
    `})),a6=()=>{let{styles:e}=a4(),{isCalendarOpen:n,setCalendarOpen:o}=ep(),[a,i]=r.default.useState(1500),[l,s]=r.default.useState(!1),c=r.default.useRef(1500),u=r.default.useRef(null),d=r.default.useCallback(()=>{try{window.localStorage.setItem("workspace-calendar-width",String(c.current))}catch{}},[]),p=r.default.useCallback(()=>{null!==u.current&&window.clearTimeout(u.current),u.current=window.setTimeout(()=>{u.current=null,d()},200)},[d]);r.default.useEffect(()=>{let e=Math.max(1500,Math.round(.8*window.innerWidth));try{let t=window.localStorage.getItem("workspace-calendar-width"),r=t?Number(t):NaN;Number.isFinite(r)&&r>0&&(e=r)}catch{}c.current=e,i(e),s(!0)},[]),r.default.useEffect(()=>()=>{null!==u.current&&(window.clearTimeout(u.current),u.current=null),l&&d()},[l,d]);let f=r.default.useCallback((e,t)=>{let r=t?.width,n="number"==typeof r?r:"string"==typeof r?Number.parseFloat(r):NaN;if(!Number.isFinite(n)||n<=0)return;let o=Math.round(n);c.current!==o&&(c.current=o,p())},[p]),m=r.default.useCallback(e=>{n!==e&&o(e)},[n,o]),h=r.default.useMemo(()=>({width:a}),[a]);return l?(0,t.jsx)("div",{className:e.overlay,children:(0,t.jsx)(ey.DraggablePanel,{className:e.panel,placement:"right",mode:"fixed",pin:!0,showHandleWhenCollapsed:!1,showHandleHighlight:!0,expand:n,defaultSize:h,minWidth:1500,onSizeChange:f,onExpandChange:m,children:n&&(0,t.jsx)("div",{style:{height:"100%"},children:(0,t.jsx)(a2,{})})})}):null};var a3=e.i(285067);let a8=(0,l.default)("play",[["path",{d:"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",key:"10ikf1"}]]);var a5=e.i(474728),a9=e.i(479673),a7=e.i(305885),ie=e.i(291717),it=e.i(847127),ir=e.i(671413),io=e.i(875433);let ia="workspace-script-editor-auto-rerun-mode",ii="workspace-script-editor-active-indicators-v1",il=it.default[0],is=new Set(it.default.map(e=>e.id)),ic=e=>it.CACHEABLE_VISIVERO_TEMPLATE_IDS.has(e);function iu(e){return!!e&&"object"==typeof e&&!Array.isArray(e)}function id(e){if(!Array.isArray(e))return[];let t=new Set,r=[];for(let n of e)"string"!=typeof n||!is.has(n)||!ic(n)||t.has(n)||(t.add(n),r.push(n));return r}function ip(e,t,r,n){try{let o=id(e),a=is.has(t)&&ic(t)?t:o[0]||il?.id||"",i=new Set(o);a&&i.add(a);let l={};for(let e of i){let t=r[e];t&&(l[e]={settingsSchema:Array.isArray(t.settingsSchema)?t.settingsSchema:[],settingsValues:iu(t.settingsValues)?{...t.settingsValues}:{},scriptTitle:"string"==typeof t.scriptTitle?t.scriptTitle:null,inspected:!!t.inspected})}let s={};for(let e of i){let t=n[e];t&&(s[e]=t)}window.localStorage.setItem(ii,JSON.stringify({version:1,activeTemplateIds:o,selectedTemplateId:a,templateStateMap:l,lastSuccessfulStateHashMap:s}))}catch{}}let im=["open","high","low","close","hl2","hlc3","ohlc4","volume"],ih=["1","3","5","15","30","60","120","240","360","480","720","1440","10080","43200"],ig=(0,o.createStyles)(({css:e,token:t})=>({overlay:e`
        position: absolute;
        inset: 0 56px 0 0;
        z-index: 1001;
        pointer-events: none;
        display: flex;
        justify-content: flex-end;
    `,panel:e`
        pointer-events: auto;
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
        background: ${t.colorBgContainer};
        height: 100% !important;
        > div { height: 100% !important; }
    `,shell:e`
        height: 100%;
        display: grid;
        grid-template-rows: 52px minmax(0, 1fr);
        background: ${t.colorBgContainer};
    `,header:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 12px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
        background: ${t.colorBgElevated};
    `,headerLeft:e`
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    `,title:e`
        font-size: 14px;
        font-weight: 600;
        color: ${t.colorText};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `,subtitle:e`
        font-size: 11px;
        color: ${t.colorTextTertiary};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `,headerRight:e`
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    `,subtleBtn:e`
        height: 32px;
        border-radius: 8px;
        border-color: ${t.colorBorderSecondary};
        background: transparent;
        color: ${t.colorTextSecondary};
        display: inline-flex;
        align-items: center;
        gap: 6px;
        &:hover {
            color: ${t.colorText};
            border-color: ${t.colorBorder};
            background: ${t.colorFillSecondary};
        }
    `,body:e`
        min-height: 0;
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        background: ${t.colorBgLayout};
        overflow: hidden;
    `,templatePane:e`
        min-height: 0;
        border-right: 1px solid ${t.colorBorderSecondary};
        background: ${t.colorBgElevated};
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
    `,searchWrap:e`
        padding: 10px;
        border-bottom: 1px solid ${t.colorBorderSecondary};
        display: flex;
        align-items: center;
        gap: 8px;
    `,searchIcon:e`
        color: ${t.colorTextQuaternary};
        flex-shrink: 0;
    `,searchInput:e`
        width: 100%;
        height: 30px;
        padding: 0 8px;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 6px;
        background: ${t.colorBgContainer};
        color: ${t.colorText};
        font-size: 12px;
        outline: none;
        &:focus { border-color: ${t.colorPrimary}; }
        &::placeholder { color: ${t.colorTextQuaternary}; }
    `,templateList:e`
        min-height: 0;
        overflow-y: auto;
        padding: 8px;
        display: grid;
        gap: 6px;
        align-content: start;
    `,templateButton:e`
        width: 100%;
        min-height: 54px;
        padding: 8px 10px;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 8px;
        background: ${t.colorBgContainer};
        color: ${t.colorTextSecondary};
        text-align: left;
        display: grid;
        gap: 3px;
        cursor: pointer;
        transition: border-color 0.12s, background 0.12s, color 0.12s;
        &:hover {
            background: ${t.colorFillSecondary};
            color: ${t.colorText};
            border-color: ${t.colorBorder};
        }
        &.active {
            background: ${t.colorPrimaryBg};
            border-color: ${t.colorPrimaryBorder};
            color: ${t.colorText};
        }
        &.selected {
            border-color: ${t.colorPrimary};
            box-shadow: inset 3px 0 0 ${t.colorPrimary};
        }
        &:disabled {
            cursor: not-allowed;
            opacity: 0.52;
            background: ${t.colorFillQuaternary};
            color: ${t.colorTextQuaternary};
            border-color: ${t.colorBorderSecondary};
        }
        &:disabled:hover {
            background: ${t.colorFillQuaternary};
            color: ${t.colorTextQuaternary};
            border-color: ${t.colorBorderSecondary};
        }
    `,templateTitleRow:e`
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    `,activeDot:e`
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: ${t.colorSuccess};
        flex-shrink: 0;
        box-shadow: 0 0 0 3px ${t.colorSuccessBg};
    `,templateName:e`
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `,templateDescription:e`
        font-size: 11px;
        line-height: 1.35;
        color: ${t.colorTextTertiary};
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    `,detailsPane:e`
        min-height: 0;
        overflow-y: auto;
        padding: 14px;
        display: grid;
        gap: 12px;
        align-content: start;
    `,selectedCard:e`
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 8px;
        background: ${t.colorBgContainer};
        padding: 12px;
        display: grid;
        gap: 8px;
    `,selectedMeta:e`
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    `,chip:e`
        display: inline-flex;
        align-items: center;
        height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: ${t.colorFillSecondary};
        color: ${t.colorTextSecondary};
        font-size: 11px;
    `,settingsHeader:e`
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: ${t.colorText};
        font-size: 12px;
        font-weight: 600;
    `,settingsHeaderLeft:e`
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    `,settingsCount:e`
        font-size: 10px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 4px;
        background: ${t.colorPrimaryBg};
        color: ${t.colorPrimary};
    `,settingsGrid:e`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 8px;
    `,settingsGroupTitle:e`
        grid-column: 1 / -1;
        font-size: 10px;
        font-weight: 700;
        color: ${t.colorTextTertiary};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 6px;
        &:first-child { margin-top: 0; }
    `,settingCard:e`
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 8px;
        background: ${t.colorBgElevated};
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    `,settingLabel:e`
        font-size: 11px;
        font-weight: 600;
        color: ${t.colorText};
        display: flex;
        align-items: center;
        gap: 5px;
    `,settingMeta:e`
        font-size: 10px;
        color: ${t.colorTextQuaternary};
        min-height: 14px;
    `,settingInput:e`
        width: 100%;
        height: 28px;
        padding: 0 8px;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 6px;
        background: ${t.colorBgContainer};
        color: ${t.colorText};
        font-size: 12px;
        outline: none;
        &:focus { border-color: ${t.colorPrimary}; }
    `,settingSelect:e`
        width: 100%;
        height: 28px;
        padding: 0 6px;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 6px;
        background: ${t.colorBgContainer};
        color: ${t.colorText};
        font-size: 12px;
        outline: none;
        &:focus { border-color: ${t.colorPrimary}; }
    `,settingCheckbox:e`
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: ${t.colorText};
        font-size: 12px;
        cursor: pointer;
    `,resetBtn:e`
        height: 28px;
        padding: 0 8px;
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 6px;
        background: transparent;
        color: ${t.colorTextSecondary};
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        &:hover {
            color: ${t.colorText};
            background: ${t.colorFillSecondary};
        }
    `,emptySettings:e`
        border: 1px dashed ${t.colorBorderSecondary};
        border-radius: 8px;
        background: ${t.colorBgContainer};
        color: ${t.colorTextTertiary};
        padding: 12px;
        font-size: 12px;
    `}));function iy(e){let t=String(e||"string").trim().toLowerCase();return["integer","number","boolean","string","select","source","timeframe","color"].includes(t)?t:"string"}function ib(e,t){let r=iy(e.kind);if(null==t)return e.default;if("boolean"===r)return"boolean"==typeof t?t:["true","1","yes","on"].includes(String(t).trim().toLowerCase());if("integer"===r){let r=Number(t);return Number.isFinite(r)?Math.trunc(r):e.default}if("number"===r){let r=Number(t);return Number.isFinite(r)?r:e.default}return String(t)}function ix({setting:e,value:r,onChange:o,styles:a}){let{t:i}=(0,n.useTranslation)("workspace"),l=iy(e.kind);if("boolean"===l){let n="boolean"==typeof r?r:["true","1","yes","on"].includes(String(r??"").toLowerCase());return(0,t.jsxs)("label",{className:a.settingCheckbox,children:[(0,t.jsx)("input",{type:"checkbox",checked:n,onChange:t=>o(e.key,t.target.checked)}),(0,t.jsx)("span",{children:i(n?"scriptEditor.on":"scriptEditor.off")})]})}if("select"===l||"source"===l||"timeframe"===l){let n=Array.isArray(e.options)&&e.options.length>0?e.options:"source"===l?im.map(e=>({label:e,value:e})):"timeframe"===l?ih.map(e=>({label:e,value:e})):[],i=String(r??""),s=n.some(e=>String(e.value)===i)?n:i?[{label:i,value:i},...n]:n;return(0,t.jsx)("select",{className:a.settingSelect,value:i,onChange:t=>o(e.key,t.target.value),children:s.map(e=>(0,t.jsx)("option",{value:String(e.value),children:String(e.label??e.value)},String(e.value)))})}if("color"===l)return(0,t.jsx)(io.SettingColorInput,{value:r??e.default,fallback:String(e.default??"#ffffff"),onCommit:t=>o(e.key,t,{immediate:!0}),style:{width:36,height:28,border:"none",padding:0,background:"transparent",cursor:"pointer"}});let s="integer"===l||"number"===l;return(0,t.jsx)("input",{className:a.settingInput,type:s?"number":"text",value:null==r?"":String(r),min:null!=e.min?String(e.min):void 0,max:null!=e.max?String(e.max):void 0,step:null!=e.step?String(e.step):"integer"===l?"1":void 0,onChange:t=>o(e.key,s?ib(e,t.target.value):t.target.value)})}let iv=()=>{let{t:e}=(0,n.useTranslation)("workspace"),{styles:o}=ig();(0,ie.useRenderPerf)("ScriptEditorDrawer",24);let a=(0,r.useRef)(null);null===a.current&&(a.current=function(){try{let e=window.localStorage.getItem(ii);if(!e){let e;return{activeTemplateIds:[...e=ir.DEFAULT_ACTIVE_INDICATOR_IDS.filter(e=>is.has(e)&&ic(e))],selectedTemplateId:e[0]||il?.id||"",templateStateMap:{},lastSuccessfulStateHashMap:{}}}let t=JSON.parse(e);if(!iu(t))return null;let r=id(t.activeTemplateIds),n=t.selectedTemplateId,o="string"==typeof n&&is.has(n)&&ic(n)?n:r[0]||il?.id||"";return{activeTemplateIds:r,selectedTemplateId:o,templateStateMap:function(e){if(!iu(e))return{};let t={};for(let[r,n]of Object.entries(e)){if(!is.has(r)||!ic(r)||!iu(n))continue;let e=Array.isArray(n.settingsSchema)?n.settingsSchema.filter(e=>iu(e)&&"string"==typeof e.key):[],o=iu(n.settingsValues)?{...n.settingsValues}:{},a=n.scriptTitle;t[r]={settingsSchema:e,settingsValues:o,scriptTitle:"string"==typeof a?a:null,inspected:"boolean"==typeof n.inspected?n.inspected:e.length>0}}return t}(t.templateStateMap),lastSuccessfulStateHashMap:function(e){if(!iu(e))return{};let t={};for(let[r,n]of Object.entries(e))is.has(r)&&ic(r)&&"string"==typeof n&&n&&(t[r]=n);return t}(t.lastSuccessfulStateHashMap)}}catch{return null}}());let{isScriptEditorOpen:i,setScriptEditorOpen:l}=ef(),s=(0,eX.useWatchlistMarketType)(),c=(0,e0.useExchange)(),u=(0,eG.useTimezoneStore)(e=>e.offsetSec),[d,p]=(0,r.useState)(()=>a.current?.selectedTemplateId||il?.id||""),[f,m]=(0,r.useState)("candle_close"),[h,g]=(0,r.useState)(!1),[y,b]=(0,r.useState)(""),[x,v]=(0,r.useState)(760),[w,S]=(0,r.useState)(!1),k=it.default.find(e=>e.id===d)||il,j=d?a.current?.templateStateMap[d]:void 0,[$,C]=(0,r.useState)(()=>j?.settingsSchema||[]),[T,M]=(0,r.useState)(()=>j?.settingsValues||{}),[N,E]=(0,r.useState)(()=>j?.scriptTitle||k?.name||null),[I,D]=(0,r.useState)(()=>a.current?.activeTemplateIds||[]),[P,O]=(0,r.useState)(()=>a.current?.templateStateMap||{}),z=(0,r.useRef)(j?.settingsValues||{}),A=(0,r.useRef)(a.current?.templateStateMap||{}),R=(0,r.useRef)(a.current?.activeTemplateIds||[]),L=(0,r.useRef)(null),F=(0,r.useRef)(760),B=(0,r.useRef)(null),H=(0,r.useRef)(null),W=(0,r.useRef)([]),U=(0,r.useRef)(void 0),Y=(0,r.useRef)(void 0),_=(0,r.useRef)(a.current?.lastSuccessfulStateHashMap||{}),V=(0,r.useRef)(null),q=(0,r.useRef)(null),K=(0,r.useRef)(!1),X=(0,r.useRef)(!1),G=(0,r.useRef)(0),Q=(0,r.useRef)(null),Z=(0,r.useRef)(0),J=(0,r.useRef)(0),ee=(0,r.useRef)(""),et=(0,r.useRef)((a.current?.activeTemplateIds.length||0)>0),er=(0,r.useCallback)(()=>({symbol:String(U.current||"").replace(/[^A-Za-z0-9]/g,"").toUpperCase(),timeframe:Y.current||"60",marketType:s,tzOffsetSec:u}),[s,u]),en=(0,r.useCallback)(e=>{let t=er();return t.symbol===e.symbol&&t.timeframe===e.timeframe&&t.marketType===e.marketType&&t.tzOffsetSec===e.tzOffsetSec},[er]),eo=(0,r.useMemo)(()=>it.default.find(e=>e.id===d)||il,[d]),ea=eo?.name??e("scriptEditor.defaultTitle"),ei=!!eo&&I.includes(eo.id),el=(0,r.useCallback)((e,t)=>{let r={...A.current,[e]:t(A.current[e])};A.current=r,O(r)},[]),es=(0,r.useCallback)((e=R.current)=>{(0,a7.syncActiveIndicators)(e.filter(ic).map(e=>{let t=it.default.find(t=>t.id===e),r=A.current[e],n=r?.settingsValues||{},o=(0,a7.getIndicatorStateHash)(t?.code??null,n);return{id:e,code:t?.code??null,settings:n,hasRun:!!o&&_.current[e]===o,scriptTitle:r?.scriptTitle||t?.name||null}}))},[]),ec=(0,r.useCallback)(()=>{try{window.localStorage.setItem("workspace-script-editor-width",String(F.current))}catch{}},[]),eu=(0,r.useCallback)(()=>{null!==B.current&&window.clearTimeout(B.current),B.current=window.setTimeout(()=>{B.current=null,ec()},200)},[ec]);(0,r.useEffect)(()=>{let e=Math.max(760,Math.round(.58*window.innerWidth));try{let t=window.localStorage.getItem("workspace-script-editor-width"),r=window.localStorage.getItem(ia),n=t?Number(t):NaN;Number.isFinite(n)&&n>0&&(e=n),("manual"===r||"context"===r||"candle_close"===r)&&m(r)}catch{}F.current=e,v(e),S(!0)},[]),(0,r.useEffect)(()=>()=>{null!==B.current&&(window.clearTimeout(B.current),B.current=null),w&&ec()},[w,ec]),(0,r.useEffect)(()=>{if(w)try{window.localStorage.setItem(ia,f)}catch{}},[f,w]);let ed=(0,r.useCallback)((e,t)=>{let r=t?.width,n="number"==typeof r?r:"string"==typeof r?Number.parseFloat(r):NaN;if(!Number.isFinite(n)||n<=0)return;let o=Math.round(n);F.current!==o&&(F.current=o,eu())},[eu]);(0,r.useEffect)(()=>{R.current=I,es(I)},[I,es]),(0,r.useEffect)(()=>{es()},[T,es]),(0,r.useEffect)(()=>{ip(I,d,P,_.current)},[I,d,P]);let ep=(0,r.useCallback)(async e=>{let t=++G.current;try{let r=await fetch("/script-runtime/inspect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:e.code,settings:{}})}),n=await r.json();if(!r.ok||t!==G.current)return;let o={settingsSchema:Array.isArray(n.settingsSchema)?n.settingsSchema:[],settingsValues:n.settingsValues&&"object"==typeof n.settingsValues?{...n.settingsValues}:{},scriptTitle:n.scriptTitle||e.name||null,inspected:!0};el(e.id,()=>o),C(o.settingsSchema),M(o.settingsValues),z.current=o.settingsValues,E(o.scriptTitle),es()}catch{if(t!==G.current)return;let r={settingsSchema:[],settingsValues:{},scriptTitle:e.name||null,inspected:!0};el(e.id,()=>r),C([]),M({}),z.current={},E(e.name||null),es()}},[es,el]);(0,r.useEffect)(()=>{eo&&(A.current[eo.id]?.inspected||ep(eo))},[eo,ep]),(0,r.useEffect)(()=>{let e=()=>{i||l(!0),0===$.length&&R.current.length>0&&Q.current&&Q.current()};return window.addEventListener("script-studio-open-settings",e),()=>window.removeEventListener("script-studio-open-settings",e)},[$.length,i,l]),(0,r.useEffect)(()=>{let e=()=>{window.dispatchEvent(new CustomEvent("script-studio-sync-settings-state",{detail:{scriptTitle:N||ea||null,settingsSchema:$,settingsValues:z.current}}))};return window.addEventListener("script-studio-request-settings-state",e),()=>window.removeEventListener("script-studio-request-settings-state",e)},[ea,N,$]),(0,r.useEffect)(()=>{let e=e=>{let t=e.detail?.settings;t&&(M(t),z.current=t,eo&&(el(eo.id,e=>({settingsSchema:e?.settingsSchema||$,settingsValues:t,scriptTitle:e?.scriptTitle||N||eo.name,inspected:e?.inspected??!0})),es()),eo&&R.current.includes(eo.id)&&Q.current&&(V.current&&clearTimeout(V.current),V.current=setTimeout(()=>{V.current=null,Q.current?.([eo.id])},100)))};return window.addEventListener("script-studio-settings-changed",e),()=>window.removeEventListener("script-studio-settings-changed",e)},[eo,$,N,el,es]),(0,r.useEffect)(()=>{let e=e=>{let t=e.detail?.data;if(!Array.isArray(t))return;let r=U.current,n=Y.current,o=Z.current,a=t.slice(-2e3);W.current=a,U.current=e.detail?.symbol,Y.current=e.detail?.timeframe;let i=void 0!==r&&e.detail?.symbol!==r,l=void 0!==n&&e.detail?.timeframe!==n,s=Math.abs(a.length-o)>10,c=i||l,u=c||s&&"manual"!==f,d=R.current.filter(e=>{let t=it.default.find(t=>t.id===e);if(!t)return!1;let r=A.current[e]?.settingsValues||{},n=(0,a7.getIndicatorStateHash)(t.code,r);return!!n&&_.current[e]!==n});if(d.length>0&&Q.current){let t=[e.detail?.symbol||"",e.detail?.timeframe||"",a.length,...[...d].sort()].join("|");if(ee.current!==t){ee.current=t,V.current&&clearTimeout(V.current),V.current=setTimeout(()=>{V.current=null,Q.current?.(d)},0),Z.current=a.length,J.current=a[a.length-1]?.time??0;return}}else 0===d.length&&(ee.current="");if(et.current&&R.current.length>0&&Q.current){et.current=!1,V.current&&clearTimeout(V.current),q.current&&clearTimeout(q.current),V.current=setTimeout(()=>{V.current=null,Q.current?.()},0),Z.current=a.length,J.current=a[a.length-1]?.time??0;return}if(u&&R.current.length>0&&Q.current){V.current&&clearTimeout(V.current),q.current&&clearTimeout(q.current),V.current=setTimeout(()=>{V.current=null,Q.current?.()},220*!c),Z.current=a.length,J.current=a[a.length-1]?.time??0;return}if(Z.current=a.length,"candle_close"!==f)return;let p=a[a.length-1]?.time??0;p>0&&p!==J.current&&R.current.length>0&&Q.current&&(J.current=p,q.current&&clearTimeout(q.current),q.current=setTimeout(()=>{q.current=null,Q.current?.()},1e3))};return window.addEventListener("script-studio-ohlc",e),()=>{window.removeEventListener("script-studio-ohlc",e),V.current&&clearTimeout(V.current),q.current&&clearTimeout(q.current)}},[f]),(0,r.useEffect)(()=>()=>{L.current&&clearTimeout(L.current)},[]);let em=(0,r.useCallback)((e,t,r,n=er())=>{var o,a;let i,l,s,c,u,p;if(!en(n))return X.current=!0,!1;let f=t.payload?(o=t.payload,a=e.id,i=`${a}__`,l=new Map,s=(o.indicators||[]).map((t,r)=>{let n=String(t.id||t.name||`${e.id}_${r}`),o=n.startsWith(i)?n:`${i}${n}`;t.id&&l.set(String(t.id),o),t.name&&l.set(String(t.name),o),t.type&&l.set(String(t.type),o);let a=t.paneId?String(t.paneId):e.id;return{...t,id:o,name:t.name||e.name,scriptTitle:e.name,paneId:a.startsWith(i)?a:`${i}${a}`}}),c=(o.markers||[]).map(e=>({...e,seriesId:e.seriesId?l.get(String(e.seriesId))||`${i}${e.seriesId}`:e.seriesId})),u=(o.fills||[]).map(e=>({...e,id:e.id?`${i}${e.id}`:`${i}${e.fromSeriesId}_${e.toSeriesId}`,fromSeriesId:l.get(String(e.fromSeriesId))||`${i}${e.fromSeriesId}`,toSeriesId:l.get(String(e.toSeriesId))||`${i}${e.toSeriesId}`})),p=(o.tables||[]).map(e=>({...e,id:e.id.startsWith(i)?e.id:`${i}${e.id}`})),{...o,indicators:s,markers:c,fills:u,tables:p}):null;if(f&&(f.indicators?.length||f.markers?.length||f.fills?.length)&&window.dispatchEvent(new CustomEvent("script-studio-indicator",{detail:{...f,runtimeScope:n,scriptTitle:t.scriptTitle||e.name||null,settingsSchema:t.settingsSchema||[],settingsValues:t.settingsValues||r}})),t.ok){let t=(0,a7.getIndicatorStateHash)(e.code,r);_.current={..._.current,[e.id]:t},ip(R.current,d,A.current,_.current),es()}if(Array.isArray(t.settingsSchema)){let n={settingsSchema:t.settingsSchema,settingsValues:t.settingsValues&&"object"==typeof t.settingsValues?{...t.settingsValues}:r,scriptTitle:t.scriptTitle||e.name||null,inspected:!0};el(e.id,()=>n),e.id===d&&(C(n.settingsSchema),M(n.settingsValues),z.current=n.settingsValues,E(n.scriptTitle))}return t.ok},[er,en,d,es,el]),eh=(0,r.useCallback)(async(e,t,r)=>{let n,o,a=A.current[e.id],i=a?.settingsValues||{},l=(0,ie.isPerfEnabled)()?performance.now():0,s=await (0,a7.executeIndicatorDescriptorForOhlc)({id:e.id,code:e.code,settings:{...i},hasRun:!0,scriptTitle:a?.scriptTitle||e.name||null},t.symbol,t.timeframe,r,{marketType:t.marketType,exchange:c,tzOffsetSec:t.tzOffsetSec});if(l>0&&(0,ie.recordPerfDuration)("script.runtime.execute",performance.now()-l,{symbol:t.symbol,timeframe:t.timeframe,template:e.id,bars:r.length||0},60),!s)throw Error("Native runtime request failed");return em(e,((o={ok:!0,output:"",cached:!0,payload:{indicators:Array.isArray((n=s.detail).indicators)?n.indicators:[],markers:Array.isArray(n.markers)?n.markers:[],fills:Array.isArray(n.fills)?n.fills:[],tables:Array.isArray(n.tables)?n.tables:[]},scriptTitle:"string"==typeof n.scriptTitle?n.scriptTitle:null,settingsSchema:Array.isArray(n.settingsSchema)&&n.settingsSchema.length>0?n.settingsSchema:void 0,settingsValues:n.settingsValues&&"object"==typeof n.settingsValues?n.settingsValues:{}}).sourceBarCount=n.sourceBarCount,o.sourceFirstTime=n.sourceFirstTime,o.sourceLastTime=n.sourceLastTime,o),i,t)},[em,c,er]),eg=(0,r.useCallback)(async e=>{let t=e?.length?e:R.current;if(0===t.length||0===W.current.length)return;if(K.current){X.current=!0;return}let r=er(),n=W.current.slice(-2e3),o=t.filter(ic).map(e=>it.default.find(t=>t.id===e)).filter(e=>!!e);if(0===o.length)return;K.current=!0,g(!0);let a=(0,ie.isPerfEnabled)()?performance.now():0;try{o.length>1&&await (0,a7.executeActiveIndicatorsForOhlcCoalesced)(r.symbol,r.timeframe,n,{marketType:r.marketType,exchange:c,tzOffsetSec:r.tzOffsetSec}).catch(()=>null),await Promise.allSettled(o.map(e=>eh(e,r,n)))}catch{}finally{a>0&&(0,ie.recordPerfDuration)("script.runtime.total",performance.now()-a,{symbol:r.symbol,timeframe:r.timeframe,templates:String(o.length),bars:n.length||0},80),K.current=!1,g(!1),X.current&&(X.current=!1,setTimeout(()=>Q.current?.(),0))}},[er,eh]);(0,r.useEffect)(()=>{Q.current=eg},[eg]);let ex=(0,r.useCallback)((e,t,r)=>{let n={...z.current,[e]:t};z.current=n,M(n),eo&&(el(eo.id,e=>({settingsSchema:e?.settingsSchema||$,settingsValues:n,scriptTitle:e?.scriptTitle||N||eo.name,inspected:e?.inspected??!0})),es()),L.current&&clearTimeout(L.current);let o=()=>{eo&&R.current.includes(eo.id)&&Q.current?.([eo.id])};if(r?.immediate){L.current=null,o();return}L.current=setTimeout(()=>{L.current=null,o()},700)},[eo,$,N,el,es]),ev=(0,r.useCallback)(()=>{let e={};for(let t of $)e[t.key]=t.default;M(e),z.current=e,eo&&(el(eo.id,t=>({settingsSchema:t?.settingsSchema||$,settingsValues:e,scriptTitle:t?.scriptTitle||N||eo.name,inspected:t?.inspected??!0})),es()),L.current&&clearTimeout(L.current),L.current=setTimeout(()=>{L.current=null,eo&&R.current.includes(eo.id)&&Q.current?.([eo.id])},400)},[eo,$,N,el,es]),ew=(0,r.useCallback)(e=>{if(!ic(e.id))return;p(e.id);let t=A.current[e.id];C(t?.settingsSchema||[]),M(t?.settingsValues||{}),z.current=t?.settingsValues||{},E(t?.scriptTitle||e.name)},[]),eS=(0,r.useCallback)(e=>{var t;window.dispatchEvent(new CustomEvent("script-studio-remove-indicators",{detail:{idPrefix:(t=e,`${t}__`)}}))},[]),ek=(0,r.useCallback)(()=>{if(!eo||!ic(eo.id))return;if(R.current.includes(eo.id)){let e=R.current.filter(e=>e!==eo.id);R.current=e,D(e),delete _.current[eo.id],eS(eo.id),es(e),ip(e,d,A.current,_.current);return}let e=[...R.current,eo.id];R.current=e,D(e),es(e),ip(e,d,A.current,_.current),Q.current?.([eo.id])},[eS,eo,d,es]),ej=(0,r.useMemo)(()=>{let e=it.default.filter(e=>ic(e.id)),t=y.trim().toLowerCase();return t?e.filter(e=>e.name.toLowerCase().includes(t)||e.description.toLowerCase().includes(t)):e},[y]),e$=(0,r.useMemo)(()=>{let t=new Map;for(let r of $){let n=String(r.group||e("scriptEditor.generalGroup")),o=t.get(n)||[];o.push(r),t.set(n,o)}return Array.from(t.entries())},[$,e]),eC=(0,r.useCallback)(e=>{i!==e&&l(e)},[i,l]),eT=(0,r.useMemo)(()=>({width:x}),[x]);return((0,r.useEffect)(()=>{if(!i)return;let e=/\bant-(popover|tooltip|select-dropdown|dropdown|picker-dropdown|cascader-dropdown|color-picker|modal|message|notification)\b/,t=t=>{let r=t.target;!r||H.current?.contains(r)||(t=>{for(let r=t;r;r=r.parentElement){let t="string"==typeof r.className?r.className:"";if(e.test(t))return!0}return!1})(r)||l(!1)};return document.addEventListener("pointerdown",t,!0),()=>document.removeEventListener("pointerdown",t,!0)},[i,l]),w)?(0,t.jsx)("div",{className:o.overlay,ref:H,children:(0,t.jsx)(ey.DraggablePanel,{className:o.panel,placement:"right",mode:"fixed",pin:!0,showHandleWhenCollapsed:!1,showHandleHighlight:!0,expand:i,defaultSize:eT,minWidth:700,onSizeChange:ed,onExpandChange:eC,children:i&&(0,t.jsxs)("div",{className:o.shell,children:[(0,t.jsxs)("div",{className:o.header,children:[(0,t.jsxs)("div",{className:o.headerLeft,children:[(0,t.jsx)("span",{className:o.title,children:ea}),(0,t.jsx)("span",{className:o.subtitle,children:e("scriptEditor.subtitle")})]}),(0,t.jsxs)("div",{className:o.headerRight,children:[(0,t.jsx)(a3.Button,{className:o.subtleBtn,icon:(0,t.jsx)(a8,{size:14}),onClick:ek,loading:h,children:ei?e("scriptEditor.remove"):e("scriptEditor.add")}),(0,t.jsx)(a3.Button,{className:o.subtleBtn,icon:(0,t.jsx)(eb.X,{size:14}),onClick:()=>l(!1)})]})]}),(0,t.jsxs)("div",{className:o.body,children:[(0,t.jsxs)("aside",{className:o.templatePane,children:[(0,t.jsxs)("div",{className:o.searchWrap,children:[(0,t.jsx)(eM.Search,{className:o.searchIcon,size:14}),(0,t.jsx)("input",{className:o.searchInput,placeholder:e("scriptEditor.searchTemplatesPlaceholder"),value:y,onChange:e=>b(e.target.value)})]}),(0,t.jsx)("div",{className:o.templateList,children:ej.map(r=>{let n=ic(r.id);return(0,t.jsxs)("button",{type:"button",className:`${o.templateButton} ${I.includes(r.id)?"active":""} ${r.id===eo?.id?"selected":""}`,title:n?r.description:e("scriptEditor.onlyBbRsiEnabled"),disabled:!n,onClick:()=>ew(r),children:[(0,t.jsxs)("span",{className:o.templateTitleRow,children:[I.includes(r.id)?(0,t.jsx)("span",{className:o.activeDot}):null,(0,t.jsx)("span",{className:o.templateName,children:r.name})]}),(0,t.jsx)("span",{className:o.templateDescription,children:r.description})]},r.id)})})]}),(0,t.jsxs)("section",{className:o.detailsPane,children:[(0,t.jsxs)("div",{className:o.selectedCard,children:[(0,t.jsx)("div",{className:o.title,children:N||eo?.name||e("scriptEditor.defaultIndicatorTitle")}),(0,t.jsx)("div",{className:o.subtitle,children:eo?.description}),(0,t.jsxs)("div",{className:o.selectedMeta,children:[(0,t.jsx)("span",{className:o.chip,children:eo?.pane||e("scriptEditor.mixedPane")}),(0,t.jsx)("span",{className:o.chip,children:s})]})]}),(0,t.jsxs)("div",{className:o.settingsHeader,children:[(0,t.jsxs)("span",{className:o.settingsHeaderLeft,children:[(0,t.jsx)(a9.Settings2,{size:14}),e("scriptEditor.settings"),(0,t.jsx)("span",{className:o.settingsCount,children:$.length})]}),(0,t.jsxs)("button",{type:"button",className:o.resetBtn,onClick:ev,disabled:0===$.length,children:[(0,t.jsx)(a5.RotateCcw,{size:12}),e("scriptEditor.reset")]})]}),0===$.length?(0,t.jsx)("div",{className:o.emptySettings,children:e("scriptEditor.noEditableSettings")}):(0,t.jsx)("div",{className:o.settingsGrid,children:e$.map(([r,n])=>(0,t.jsxs)("div",{style:{display:"contents"},children:[(0,t.jsx)("div",{className:o.settingsGroupTitle,children:r}),n.map(r=>{let n=Object.prototype.hasOwnProperty.call(T,r.key)?T[r.key]:r.default;return(0,t.jsxs)("div",{className:o.settingCard,children:[(0,t.jsxs)("div",{className:o.settingLabel,children:[e(`scriptEditor.settingTitles.${r.key}`,{defaultValue:r.title||r.key}),r.hidden?(0,t.jsx)("span",{className:o.chip,children:e("scriptEditor.hidden")}):null]}),(0,t.jsx)("div",{className:o.settingMeta,children:null!=r.min||null!=r.max?e("scriptEditor.range",{min:r.min??"-",max:r.max??"-"}):null!=r.default?e("scriptEditor.default",{value:r.default}):""}),(0,t.jsx)(ix,{setting:r,value:n,styles:o,onChange:(e,t)=>ex(e,ib(r,t))})]},r.key)})]},r))})]})]})]})})}):null},iw=(0,l.default)("house",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]]),iS=(0,l.default)("circle-question-mark",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]),ik=(0,l.default)("moon",[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]]),ij=(0,l.default)("pen-tool",[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",key:"nt11vn"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",key:"15qc1e"}],["path",{d:"m2.3 2.3 7.286 7.286",key:"1wuzzi"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]]),i$=(0,l.default)("keyboard",[["path",{d:"M10 8h.01",key:"1r9ogq"}],["path",{d:"M12 12h.01",key:"1mp3jc"}],["path",{d:"M14 8h.01",key:"1primd"}],["path",{d:"M16 12h.01",key:"1l6xoz"}],["path",{d:"M18 8h.01",key:"emo2bl"}],["path",{d:"M6 8h.01",key:"x9i8wu"}],["path",{d:"M7 16h10",key:"wp8him"}],["path",{d:"M8 12h.01",key:"czm47f"}],["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}]]),iC=(0,l.default)("menu",[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]]);var iT=e.i(422804),iM=e.i(574807),iN=e.i(763618);let iE=(0,l.default)("calendar-x-2",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8",key:"3spt84"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m17 22 5-5",key:"1k6ppv"}],["path",{d:"m17 17 5 5",key:"p7ous7"}]]);var iI=e.i(901386),iD=e.i(395259),iP=e.i(22436),iO=e.i(637939),iz=e.i(908249),iA=e.i(182081),iR=e.i(304246),iL=e.i(887250);function iF(e){let[t,n]=r.useState(e);return r.useEffect(()=>{let t=setTimeout(()=>{n(e)},10*!e.length);return()=>{clearTimeout(t)}},[e]),t}var iB=e.i(643778),iH=e.i(456594);let iW=(e,t)=>{let{formItemCls:r}=e;return{[r]:{[`${r}-label > label`]:{height:t},[`${r}-control-input`]:{minHeight:t}}}},iU=e=>({padding:e.verticalLabelPadding,margin:e.verticalLabelMargin,whiteSpace:"initial",textAlign:"start","> label":{margin:0,"&::after":{visibility:"hidden"}}}),iY=(e,t)=>(0,aY.mergeToken)(e,{formItemCls:`${e.componentCls}-item`,rootPrefixCls:t}),i_=(0,aU.genStyleHooks)("Form",(e,{rootPrefixCls:t})=>{let r=iY(e,t);return[(e=>{let{componentCls:t}=e;return{[e.componentCls]:{...(0,aW.resetComponent)(e),...{legend:{display:"block",width:"100%",marginBottom:e.marginLG,padding:0,color:e.colorTextDescription,fontSize:e.fontSizeLG,lineHeight:"inherit",border:0,borderBottom:`${(0,aB.unit)(e.lineWidth)} ${e.lineType} ${e.colorBorder}`},'input[type="search"]':{boxSizing:"border-box"},'input[type="radio"], input[type="checkbox"]':{lineHeight:"normal"},'input[type="file"]':{display:"block"},'input[type="range"]':{display:"block",width:"100%"},"select[multiple], select[size]":{height:"auto"},[`input[type='file']:focus,
  input[type='radio']:focus,
  input[type='checkbox']:focus`]:{outline:0,boxShadow:`0 0 0 ${(0,aB.unit)(e.controlOutlineWidth)} ${e.controlOutline}`},output:{display:"block",paddingTop:15,color:e.colorText,fontSize:e.fontSize,lineHeight:e.lineHeight}},[`${t}-text`]:{display:"inline-block",paddingInlineEnd:e.paddingSM},"&-small":{...iW(e,e.controlHeightSM)},"&-large":{...iW(e,e.controlHeightLG)}}}})(r),(e=>{let{formItemCls:t,iconCls:r,rootPrefixCls:n,antCls:o,labelRequiredMarkColor:a,labelColor:i,labelFontSize:l,labelHeight:s,labelColonMarginInlineStart:c,labelColonMarginInlineEnd:u,itemMarginBottom:d}=e,[p]=(0,aU.genCssVar)(o,"grid");return{[t]:{...(0,aW.resetComponent)(e),marginBottom:d,verticalAlign:"top","&-with-help":{transition:"none"},[`&-hidden,
        &-hidden${o}-row`]:{display:"none"},"&-has-warning":{[`${t}-split`]:{color:e.colorError}},"&-has-error":{[`${t}-split`]:{color:e.colorWarning}},[`${t}-label`]:{flexGrow:0,overflow:"hidden",whiteSpace:"nowrap",textAlign:"end",verticalAlign:"middle","&-left":{textAlign:"start"},"&-wrap":{overflow:"unset",lineHeight:e.lineHeight,whiteSpace:"unset","> label":{verticalAlign:"middle",textWrap:"balance"}},"> label":{position:"relative",display:"inline-flex",alignItems:"center",maxWidth:"100%",height:s,color:i,fontSize:l,[`> ${r}`]:{fontSize:e.fontSize,verticalAlign:"top"},[`&${t}-required`]:{"&::before":{display:"inline-block",marginInlineEnd:e.marginXXS,color:a,fontSize:e.fontSize,fontFamily:"SimSun, sans-serif",lineHeight:1,content:'"*"'},[`&${t}-required-mark-hidden, &${t}-required-mark-optional`]:{"&::before":{display:"none"}}},[`${t}-optional`]:{display:"inline-block",marginInlineStart:e.marginXXS,color:e.colorTextDescription,[`&${t}-required-mark-hidden`]:{display:"none"}},[`${t}-tooltip`]:{color:e.colorTextDescription,cursor:"help",writingMode:"horizontal-tb",marginInlineStart:e.marginXXS},"&::after":{content:'":"',position:"relative",marginBlock:0,marginInlineStart:c,marginInlineEnd:u},[`&${t}-no-colon::after`]:{content:'"\\a0"'}}},[`${t}-control`]:{[p("display")]:"flex",flexDirection:"column",flexGrow:1,[`&:first-child:not([class^="'${n}-col-'"]):not([class*="' ${n}-col-'"])`]:{width:"100%"},"&-input":{position:"relative",display:"flex",alignItems:"center",minHeight:e.controlHeight,"&-content":{flex:"auto",maxWidth:"100%",[`&:has(> ${o}-switch:only-child, > ${o}-rate:only-child)`]:{display:"flex",alignItems:"center"}}}},[t]:{"&-additional":{display:"flex",flexDirection:"column"},"&-explain, &-extra":{clear:"both",color:e.colorTextDescription,fontSize:e.fontSize,lineHeight:e.lineHeight},"&-explain-connected":{width:"100%"},"&-extra":{minHeight:e.controlHeightSM,transition:`color ${e.motionDurationMid} ${e.motionEaseOut}`},"&-explain":{"&-error":{color:e.colorError},"&-warning":{color:e.colorWarning}}},[`&-with-help ${t}-explain`]:{height:"auto",opacity:1},[`${t}-feedback-icon`]:{fontSize:e.fontSize,textAlign:"center",visibility:"visible",animationName:iH.zoomIn,animationDuration:e.motionDurationMid,animationTimingFunction:e.motionEaseOutBack,pointerEvents:"none","&-success":{color:e.colorSuccess},"&-error":{color:e.colorError},"&-warning":{color:e.colorWarning},"&-validating":{color:e.colorPrimary}}}}})(r),(e=>{let{componentCls:t,motionDurationFast:r,motionEaseInOut:n}=e,o=`${t}-show-help`,a=`${t}-show-help-item`;return{[o]:{transition:`opacity ${r} ${n}`,"&-appear, &-enter":{opacity:0,"&-active":{opacity:1}},"&-leave":{opacity:1,"&-active":{opacity:0}},[a]:{overflow:"hidden",transition:`${["height","opacity","transform"].map(e=>`${e} ${r} ${n}`).join(", ")} !important`,[`&${a}-appear, &${a}-enter`]:{transform:"translateY(-5px)",opacity:0,"&-active":{transform:"translateY(0)",opacity:1}},[`&${a}-leave-active`]:{transform:"translateY(-5px)"}}}}})(r),(e=>{let{antCls:t,formItemCls:r}=e;return{[`${r}-horizontal`]:{[`${r}-label`]:{flexGrow:0},[`${r}-control`]:{flex:"1 1 0",minWidth:0},[`${r}-label[class$='-24'], ${r}-label[class*='-24 ']`]:{[`& + ${r}-control`]:{minWidth:"unset"}},[`${t}-col-24${r}-label,
        ${t}-col-xl-24${r}-label`]:iU(e)}}})(r),(e=>{let{componentCls:t,formItemCls:r,inlineItemMarginBottom:n}=e;return{[`${t}-inline`]:{display:"flex",flexWrap:"wrap",[`${r}-inline`]:{flex:"none",marginInlineEnd:e.margin,marginBottom:n,"&-row":{flexWrap:"nowrap"},[`> ${r}-label,
        > ${r}-control`]:{display:"inline-block",verticalAlign:"top"},[`> ${r}-label`]:{flex:"none"},[`${t}-text`]:{display:"inline-block"},[`${r}-has-feedback`]:{display:"inline-block"}}}}})(r),(e=>{let{componentCls:t,formItemCls:r,antCls:n}=e;return{[`${r}-vertical`]:{[`${r}-row`]:{flexDirection:"column"},[`${r}-label > label`]:{height:"auto"},[`${r}-control`]:{width:"100%"},[`${r}-label,
        ${n}-col-24${r}-label,
        ${n}-col-xl-24${r}-label`]:iU(e)},[`@media (max-width: ${(0,aB.unit)(e.screenXSMax)})`]:[(e=>{let{componentCls:t,formItemCls:r,rootPrefixCls:n}=e;return{[`${r} ${r}-label`]:iU(e),[`${t}:not(${t}-inline)`]:{[r]:{flexWrap:"wrap",[`${r}-label, ${r}-control`]:{[`&:not([class*=" ${n}-col-xs"])`]:{flex:"0 0 100%",maxWidth:"100%"}}}}}})(e),{[t]:{[`${r}:not(${r}-horizontal)`]:{[`${n}-col-xs-24${r}-label`]:iU(e)}}}],[`@media (max-width: ${(0,aB.unit)(e.screenSMMax)})`]:{[t]:{[`${r}:not(${r}-horizontal)`]:{[`${n}-col-sm-24${r}-label`]:iU(e)}}},[`@media (max-width: ${(0,aB.unit)(e.screenMDMax)})`]:{[t]:{[`${r}:not(${r}-horizontal)`]:{[`${n}-col-md-24${r}-label`]:iU(e)}}},[`@media (max-width: ${(0,aB.unit)(e.screenLGMax)})`]:{[t]:{[`${r}:not(${r}-horizontal)`]:{[`${n}-col-lg-24${r}-label`]:iU(e)}}}}})(r),(0,iB.genCollapseMotion)(r),iH.zoomIn]},e=>({labelRequiredMarkColor:e.colorError,labelColor:e.colorTextHeading,labelFontSize:e.fontSize,labelHeight:e.controlHeight,labelColonMarginInlineStart:e.marginXXS/2,labelColonMarginInlineEnd:e.marginXS,itemMarginBottom:e.marginLG,verticalLabelPadding:`0 0 ${e.paddingXS}px`,verticalLabelMargin:0,inlineItemMarginBottom:0}),{order:-1e3}),iV=[];function iq(e,t,r,n=0){return{key:"string"==typeof e?e:`${t}-${n}`,error:e,errorStatus:r}}let iK=({help:e,helpStatus:t,errors:n=iV,warnings:o=iV,className:a,fieldId:i,onVisibleChanged:l})=>{let{prefixCls:s}=r.useContext(aI.FormItemPrefixContext),c=`${s}-item-explain`,u=(0,iL.default)(s),[d,p]=i_(s,u),f=r.useMemo(()=>(0,iR.default)(s),[s]),m=iF(n),h=iF(o),g=r.useMemo(()=>(0,iA.default)(e)?[iq(e,"help",t)]:[].concat((0,iP.default)(m.map((e,t)=>iq(e,"error","error",t))),(0,iP.default)(h.map((e,t)=>iq(e,"warning","warning",t)))),[e,t,m,h]),y=r.useMemo(()=>{let e={};return g.forEach(({key:t})=>{e[t]=(e[t]||0)+1}),g.map((t,r)=>({...t,key:e[t.key]>1?`${t.key}-fallback-${r}`:t.key}))},[g]),b={};return i&&(b.id=`${i}_help`),r.createElement(iO.default,{motionDeadline:f.motionDeadline,motionName:`${s}-show-help`,visible:!!y.length,onVisibleChanged:l},e=>{let{className:t,style:n}=e;return r.createElement("div",{...b,className:(0,r5.clsx)(c,t,p,u,a,d),style:n},r.createElement(iz.CSSMotionList,{keys:y,...(0,iR.default)(s),motionName:`${s}-show-help-item`,component:!1},e=>{let{key:t,error:n,errorStatus:o,className:a,style:i}=e;return r.createElement("div",{key:t,className:(0,r5.clsx)(a,{[`${c}-${o}`]:o}),style:i},n)}))})};var iX=e.i(462110),iG=e.i(332523),iG=iG,iQ=e.i(161437),iQ=iQ,iZ=e.i(406907),iJ=e.i(135030),i0=e.i(240444),i1=e.i(192280),i2=e.i(940607);let i4=r.forwardRef((e,t)=>{let n=r.useContext(iZ.default),{getPrefixCls:o,direction:a,requiredMark:i,colon:l,scrollToFirstError:s,className:c,style:u,styles:d,classNames:p,tooltip:f}=(0,aN.useComponentConfig)("form"),{prefixCls:m,className:h,rootClassName:g,size:y,disabled:b=n,form:x,colon:v,labelAlign:w,labelWrap:S,labelCol:k,wrapperCol:j,layout:$="horizontal",scrollToFirstError:C,requiredMark:T,onFinishFailed:M,name:N,style:E,feedbackIcons:I,variant:D,classNames:P,styles:O,tooltip:z,...A}=e,R=(0,iJ.default)(y),L=r.useContext(i2.default),F=r.useMemo(()=>void 0!==T?T:void 0===i||i,[T,i]),B=v??l,H={...f,...z},W=o("form",m),U=(0,iL.default)(W),[Y,_]=i_(W,U),V={...e,size:R,disabled:b,layout:$,colon:B,requiredMark:F},[q,K]=(0,aM.useMergeSemantic)([p,P],[d,O],{props:V}),X=(0,r5.clsx)(W,`${W}-${$}`,{[`${W}-hide-required-mark`]:!1===F,[`${W}-rtl`]:"rtl"===a,[`${W}-${R}`]:R},_,U,Y,c,h,g,q.root),[G]=(0,i1.default)(x),{__INTERNAL__:Q}=G;Q.name=N;let Z=r.useMemo(()=>({name:N,labelAlign:w,labelCol:k,labelWrap:S,wrapperCol:j,layout:$,colon:B,requiredMark:F,itemRef:Q.itemRef,form:G,feedbackIcons:I,tooltip:H,classNames:q,styles:K}),[N,w,k,j,$,B,F,G,I,q,K,H]),J=r.useRef(null);r.useImperativeHandle(t,()=>({...G,nativeElement:J.current?.nativeElement}));let ee=(e,t)=>{if(e){let r={block:"nearest"};"object"==typeof e&&(r={...r,...e}),G.scrollToField(t,r)}};return r.createElement(aI.VariantContext.Provider,{value:D},r.createElement(iZ.DisabledContextProvider,{disabled:b},r.createElement(i0.default.Provider,{value:R},r.createElement(aI.FormProvider,{validateMessages:L},r.createElement(aI.FormContext.Provider,{value:Z},r.createElement(aI.NoFormStyle,{status:!0},r.createElement(iX.default,{id:N,...A,name:N,onFinishFailed:e=>{if(M?.(e),e.errorFields.length){let t=e.errorFields[0].name;if(void 0!==C)return void ee(C,t);void 0!==s&&ee(s,t)}},form:G,ref:J,style:{...K?.root,...u,...E},className:X})))))))});var iQ=iQ,i6=e.i(844380),i6=i6,i3=e.i(873344),i3=i3,i8=e.i(60056),i8=i8,i5=e.i(799035),i9=e.i(590229),i7=e.i(167401),le=e.i(849707),lt=e.i(979881);let lr=()=>{let{status:e,errors:t=[],warnings:n=[]}=r.useContext(aI.FormItemInputContext);return{status:e,errors:t,warnings:n}};lr.Context=aI.FormItemInputContext;var ln=e.i(604804),lo=e.i(671181),la=e.i(769884),li=e.i(348137);let ll=(0,r.createContext)({});var ls=e.i(374211);function lc(e,t){let[n,o]=r.useState("string"==typeof e?e:"");return r.useEffect(()=>{(()=>{if("string"==typeof e&&o(e),"object"==typeof e)for(let r=0;r<la.responsiveArray.length;r++){let n=la.responsiveArray[r];if(!t||!t[n])continue;let a=e[n];if(void 0!==a)return void o(a)}})()},[JSON.stringify(e),t]),n}let lu=r.forwardRef((e,t)=>{let n,o,a,{prefixCls:i,justify:l,align:s,className:c,style:u,children:d,gutter:p=0,wrap:f,...m}=e,{getPrefixCls:h,direction:g}=r.useContext(aN.ConfigContext),y=(0,li.default)(!0,null),b=lc(s,y),x=lc(l,y),v=h("row",i),[w,S]=(0,ls.useRowStyle)(v),k=(n=[void 0,void 0],o=Array.isArray(p)?p:[p,void 0],a=y||{xs:!0,sm:!0,md:!0,lg:!0,xl:!0,xxl:!0,xxxl:!0},o.forEach((e,t)=>{if("object"==typeof e&&null!==e)for(let r=0;r<la.responsiveArray.length;r++){let o=la.responsiveArray[r];if(a[o]&&void 0!==e[o]){n[t]=e[o];break}}else n[t]=e}),n),j=(0,r5.clsx)(v,{[`${v}-no-wrap`]:!1===f,[`${v}-${x}`]:x,[`${v}-${b}`]:b,[`${v}-rtl`]:"rtl"===g},c,w,S),$={};k?.[0]&&($.marginInline="number"==typeof k[0]?`${-(k[0]/2)}px`:`calc(${k[0]} / -2)`);let[C,T]=k;$.rowGap=T;let M=r.useMemo(()=>({gutter:[C,T],wrap:f}),[C,T,f]);return r.createElement(ll.Provider,{value:M},r.createElement("div",{...m,className:j,style:{...$,...u},ref:t},d))});var ld=e.i(48257),ld=ld;function lp(e){return"auto"===e?"1 1 auto":"number"!=typeof e||Number.isNaN(e)?/^\d+(\.\d+)?(px|em|rem|%)$/.test(e)?`0 0 ${e}`:e:`${e} ${e} auto`}let lf=r.forwardRef((e,t)=>{let{getPrefixCls:n,direction:o}=r.useContext(aN.ConfigContext),{gutter:a,wrap:i}=r.useContext(ll),{prefixCls:l,span:s,order:c,offset:u,push:d,pull:p,className:f,children:m,flex:h,style:g,...y}=e,b=n("col",l),x=n(),[v,w]=(0,ls.useColStyle)(b),[S]=(0,aU.genCssVar)(x,"col"),k={},j={};la.responsiveArrayReversed.forEach(t=>{let r={},n=e[t];"number"==typeof n?r.span=n:"object"==typeof n&&(r=n||{}),delete y[t],j={...j,[`${b}-${t}-${r.span}`]:void 0!==r.span,[`${b}-${t}-order-${r.order}`]:r.order||0===r.order,[`${b}-${t}-offset-${r.offset}`]:r.offset||0===r.offset,[`${b}-${t}-push-${r.push}`]:r.push||0===r.push,[`${b}-${t}-pull-${r.pull}`]:r.pull||0===r.pull,[`${b}-rtl`]:"rtl"===o},r.flex&&(j[`${b}-${t}-flex`]=!0,k[S(`${t}-flex`)]=lp(r.flex))});let $=(0,r5.clsx)(b,{[`${b}-${s}`]:void 0!==s,[`${b}-order-${c}`]:c,[`${b}-offset-${u}`]:u,[`${b}-push-${d}`]:d,[`${b}-pull-${p}`]:p},f,j,v,w),C={};return a?.[0]&&(C.paddingInline="number"==typeof a[0]?`${a[0]/2}px`:`calc(${a[0]} / 2)`),h&&(C.flex=lp(h),!1!==i||C.minWidth||(C.minWidth=0)),r.createElement("div",{...y,style:{...C,...g,...k},className:$,ref:t},m)}),lm=(0,aU.genSubStyleComponent)(["Form","item-item"],(e,{rootPrefixCls:t})=>(e=>{let{formItemCls:t}=e;return{"@media screen and (-ms-high-contrast: active), (-ms-high-contrast: none)":{[`${t}-control`]:{display:"flex"}}}})(iY(e,t))),lh=e=>{let{prefixCls:t,status:n,labelCol:o,wrapperCol:a,children:i,errors:l,warnings:s,_internalItemRender:c,extra:u,help:d,fieldId:p,marginBottom:f,onErrorVisibleChanged:m,label:h}=e,g=`${t}-item`,y=r.useContext(aI.FormContext),{classNames:b,styles:x}=y,v=r.useMemo(()=>{let e={...a||y.wrapperCol||{}};return null!==h||o||a||!y.labelCol||[void 0].concat((0,iP.default)(la.responsiveArrayReversed)).forEach(t=>{let r=t?[t]:[],n=(0,ld.default)(y.labelCol,r),o="object"==typeof n?n:{},a=(0,ld.default)(e,r);"span"in o&&!("offset"in("object"==typeof a?a:{}))&&o.span<24&&(e=(0,aT.default)(e,[].concat(r,["offset"]),o.span))}),e},[a,y.wrapperCol,y.labelCol,h,o]),w=(0,r5.clsx)(`${g}-control`,v.className),S=r.useMemo(()=>{let{labelCol:e,wrapperCol:t,...r}=y;return r},[y]),k=r.useRef(null),[j,$]=r.useState(0);(0,r9.default)(()=>{u&&k.current?$(k.current.clientHeight):$(0)},[u]);let C=r.createElement("div",{className:`${g}-control-input`},r.createElement("div",{className:(0,r5.clsx)(`${g}-control-input-content`,b?.content),style:x?.content},i)),T=r.useMemo(()=>({prefixCls:t,status:n}),[t,n]),M=null!==f||l.length||s.length?r.createElement(aI.FormItemPrefixContext.Provider,{value:T},r.createElement(iK,{fieldId:p,errors:l,warnings:s,help:d,helpStatus:n,className:`${g}-explain-connected`,onVisibleChanged:m})):null,N={};p&&(N.id=`${p}_extra`);let E=u?r.createElement("div",{...N,className:`${g}-extra`,ref:k},u):null,I=M||E?r.createElement("div",{className:`${g}-additional`,style:f?{minHeight:f+j}:{}},M,E):null,D=c&&"pro_table_render"===c.mark&&c.render?c.render(e,{input:C,errorList:M,extra:E}):r.createElement(r.Fragment,null,C,I);return r.createElement(aI.FormContext.Provider,{value:S},r.createElement(lf,{...v,className:w},D),r.createElement(lm,{prefixCls:t}))},lg={icon:{tag:"svg",attrs:{viewBox:"64 64 896 896",focusable:"false"},children:[{tag:"path",attrs:{d:"M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"}},{tag:"path",attrs:{d:"M623.6 316.7C593.6 290.4 554 276 512 276s-81.6 14.5-111.6 40.7C369.2 344 352 380.7 352 420v7.6c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V420c0-44.1 43.1-80 96-80s96 35.9 96 80c0 31.1-22 59.6-56.1 72.7-21.2 8.1-39.2 22.3-52.1 40.9-13.1 19-19.9 41.8-19.9 64.9V620c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8v-22.7a48.3 48.3 0 0130.9-44.8c59-22.7 97.1-74.7 97.1-132.5.1-39.3-17.1-76-48.3-103.3zM472 732a40 40 0 1080 0 40 40 0 10-80 0z"}}]},name:"question-circle",theme:"outlined"};var ly=e.i(536443);function lb(){return(lb=Object.assign.bind()).apply(this,arguments)}let lx=r.forwardRef((e,t)=>r.createElement(ly.default,lb({},e,{ref:t,icon:lg})));var lv=e.i(723783),lw=e.i(2250);let lS=({prefixCls:e,label:t,htmlFor:n,labelCol:o,labelAlign:a,colon:i,required:l,requiredMark:s,tooltip:c,vertical:u})=>{let d,[p]=(0,aE.useLocale)("Form"),{labelAlign:f,labelCol:m,labelWrap:h,colon:g,classNames:y,styles:b,tooltip:x}=r.useContext(aI.FormContext);if(!t)return null;let v=o||m||{},w=`${e}-item-label`,S=(0,r5.clsx)(w,"left"===(a||f)&&`${w}-left`,v.className,{[`${w}-wrap`]:!!h}),k=t,j=!0===i||!1!==g&&!1!==i;j&&!u&&"string"==typeof t&&t.trim()&&(k=t.replace(/[:|：]\s*$/,""));let $=(0,iA.default)(c)?"object"!=typeof c||(0,r.isValidElement)(c)?{...x,title:c}:{...x,...c}:null;if($){let t=r.createElement(lw.default,{...$},r.createElement("span",{className:`${e}-item-tooltip`,onClick:e=>{e.preventDefault()},tabIndex:-1},$.icon||$.children||r.createElement(lx,null)));k=r.createElement(r.Fragment,null,k,t)}let C="optional"===s,T="function"==typeof s;T?k=s(k,{required:!!l}):C&&!l&&(k=r.createElement(r.Fragment,null,k,r.createElement("span",{className:`${e}-item-optional`,title:""},p?.optional||lv.default.Form?.optional))),!1===s?d="hidden":(C||T)&&(d="optional");let M=(0,r5.clsx)(y?.label,{[`${e}-item-required`]:l,[`${e}-item-required-mark-${d}`]:d,[`${e}-item-no-colon`]:!j});return r.createElement(lf,{...v,className:S},r.createElement("label",{htmlFor:n,className:M,style:b?.label,title:"string"==typeof t?t:""},k))};var lk=e.i(612679),lj=e.i(206045),l$=e.i(325878),lC=e.i(145395);let lT={success:lk.default,warning:l$.default,error:lj.default,validating:lC.default},lM=function({children:e,errors:t,warnings:n,hasFeedback:o,validateStatus:a,prefixCls:i,meta:l,noStyle:s,name:c}){let u=`${i}-item`,{feedbackIcons:d}=r.useContext(aI.FormContext),p=(0,ln.getStatus)(t,n,l,null,!!o,a),{isFormItemInput:f,status:m,hasFeedback:h,feedbackIcon:g,name:y}=r.useContext(aI.FormItemInputContext),b=r.useMemo(()=>{let e;if(o){let a=!0!==o&&o.icons||d,i=p&&a?.({status:p,errors:t,warnings:n})?.[p],l=p?lT[p]:null;e=!1!==i&&l?r.createElement("span",{className:(0,r5.clsx)(`${u}-feedback-icon`,`${u}-feedback-icon-${p}`)},i||r.createElement(l,null)):null}let a={status:p||"",errors:t,warnings:n,hasFeedback:!!o,feedbackIcon:e,isFormItemInput:!0,name:c};return s&&(a.status=(p??m)||"",a.isFormItemInput=f,a.hasFeedback=!!(o??h),a.feedbackIcon=void 0!==o?a.feedbackIcon:g,a.name=c??y),a},[p,o,s,f,m]);return r.createElement(aI.FormItemInputContext.Provider,{value:b},e)};function lN(e){let{prefixCls:t,className:n,rootClassName:o,style:a,help:i,errors:l,warnings:s,validateStatus:c,meta:u,hasFeedback:d,hidden:p,children:f,fieldId:m,required:h,isRequired:g,onSubItemMetaChange:y,layout:b,name:x,...v}=e,w=`${t}-item`,{requiredMark:S,layout:k}=r.useContext(aI.FormContext),j=b||k,$="vertical"===j,C=r.useRef(null),T=iF(l),M=iF(s),N=(0,iA.default)(i),E=!!(N||l.length||s.length),I=!!C.current&&(0,ol.default)(C.current),[D,P]=r.useState(null);(0,r9.default)(()=>{E&&C.current&&P(Number.parseInt(getComputedStyle(C.current).marginBottom,10))},[E,I]);let O=((e=!1)=>{let t=e?T:u.errors,r=e?M:u.warnings;return(0,ln.getStatus)(t,r,u,"",!!d,c)})(),z=(0,r5.clsx)(w,n,o,{[`${w}-with-help`]:N||T.length||M.length,[`${w}-has-feedback`]:O&&d,[`${w}-has-success`]:"success"===O,[`${w}-has-warning`]:"warning"===O,[`${w}-has-error`]:"error"===O,[`${w}-is-validating`]:"validating"===O,[`${w}-hidden`]:p,[`${w}-${j}`]:j});return r.createElement("div",{className:z,style:a,ref:C},r.createElement(lu,{className:`${w}-row`,...(0,lo.omit)(v,["_internalItemRender","colon","dependencies","extra","fieldKey","getValueFromEvent","getValueProps","htmlFor","id","initialValue","isListField","label","labelAlign","labelCol","labelWrap","messageVariables","name","normalize","noStyle","preserve","requiredMark","rules","shouldUpdate","trigger","tooltip","validateFirst","validateTrigger","valuePropName","wrapperCol","validateDebounce"])},r.createElement(lS,{htmlFor:m,...e,requiredMark:S,required:h??g,prefixCls:t,vertical:$}),r.createElement(lh,{...e,...u,errors:T,warnings:M,prefixCls:t,status:O,help:i,marginBottom:D,onErrorVisibleChanged:e=>{e||P(null)}},r.createElement(aI.NoStyleItemContext.Provider,{value:y},r.createElement(lM,{prefixCls:t,meta:u,errors:u.errors,warnings:u.warnings,hasFeedback:d,validateStatus:O,name:x},f)))),!!D&&r.createElement("div",{className:`${w}-margin-offset`,style:{marginBottom:-D}}))}let lE=r.memo(e=>e.children,(e,t)=>{var r,n;let o,a;return r=e.control,n=t.control,o=Object.keys(r),a=Object.keys(n),o.length===a.length&&o.every(e=>{let t=r[e],o=n[e];return t===o||"function"==typeof t||"function"==typeof o})&&e.update===t.update&&e.childProps.length===t.childProps.length&&e.childProps.every((e,r)=>e===t.childProps[r])});function lI(){return{errors:[],warnings:[],touched:!1,validating:!1,name:[],validated:!1}}let lD=function(e){let{name:t,noStyle:n,className:o,dependencies:a,prefixCls:i,shouldUpdate:l,rules:s,children:c,required:u,label:d,messageVariables:p,trigger:f="onChange",validateTrigger:m,hidden:h,help:g,layout:y}=e,{getPrefixCls:b}=r.useContext(aN.ConfigContext),{name:x}=r.useContext(aI.FormContext),v=function(e){if("function"==typeof e)return e;let t=(0,lt.toArray)(e);return t.length<=1?t[0]:t}(c),w="function"==typeof v,S=r.useContext(aI.NoStyleItemContext),{validateTrigger:k}=r.useContext(i3.default),j=(0,iA.default)(m)?m:k,$=(0,iA.default)(t),C=b("form",i),T=(0,iL.default)(C),[M,N]=i_(C,T);(0,le.devUseWarning)("Form.Item");let E=r.useContext(i8.default),I=r.useRef(null),[D,P]=function(e){let[t,n]=r.useState(e),o=r.useRef(null),a=r.useRef([]),i=r.useRef(!1);return r.useEffect(()=>(i.current=!1,()=>{i.current=!0,nB.default.cancel(o.current),o.current=null}),[]),[t,function(e){i.current||(null===o.current&&(a.current=[],o.current=(0,nB.default)(()=>{o.current=null,n(e=>{let t=e;return a.current.forEach(e=>{t=e(t)}),t})})),a.current.push(e))}]}({}),[O,z]=(0,i9.default)(()=>lI()),A=(e,t)=>{P(r=>{let n={...r},o=[].concat((0,iP.default)(e.name.slice(0,-1)),(0,iP.default)(t)).join("__SPLIT__");return e.destroy?delete n[o]:n[o]=e,n})},[R,L]=r.useMemo(()=>{let e=(0,iP.default)(O.errors),t=(0,iP.default)(O.warnings);return Object.values(D).forEach(r=>{e.push.apply(e,(0,iP.default)(r.errors||[])),t.push.apply(t,(0,iP.default)(r.warnings||[]))}),[e,t]},[D,O.errors,O.warnings]),F=function(){let{itemRef:e}=r.useContext(aI.FormContext),t=r.useRef({});return function(r,n){let o=n&&"object"==typeof n&&(0,i5.getNodeRef)(n),a=r.join("_");return(t.current.name!==a||t.current.originRef!==o)&&(t.current.name=a,t.current.originRef=o,t.current.ref=(0,i5.composeRef)(e(r),o)),t.current.ref}}();function B(a,i,l){return n&&!h?r.createElement(lM,{prefixCls:C,hasFeedback:e.hasFeedback,validateStatus:e.validateStatus,meta:O,errors:R,warnings:L,noStyle:!0,name:t},a):r.createElement(lN,{key:"row",...e,className:(0,r5.clsx)(o,N,T,M),prefixCls:C,fieldId:i,isRequired:l,errors:R,warnings:L,meta:O,onSubItemMetaChange:A,layout:y,name:t},a)}if(!$&&!w&&!a)return B(v);let H={};return"string"==typeof d?H.label=d:t&&(H.label=String(t)),p&&(H={...H,...p}),r.createElement(i6.default,{...e,messageVariables:H,trigger:f,validateTrigger:j,onMetaChange:e=>{let t=E?.getKey(e.name);if(z(e.destroy?lI():e,!0),n&&!1!==g&&S){let r=e.name;if(e.destroy)r=I.current||r;else if(void 0!==t){let[e,n]=t;I.current=r=[e].concat((0,iP.default)(n))}S(e,r)}}},(n,o,i)=>{let c=(0,ln.toArray)(t).length&&o?o.name:[],d=(0,ln.getFieldId)(c,x),p=void 0!==u?u:!!s?.some(e=>{if(e&&"object"==typeof e&&e.required&&!e.warningOnly)return!0;if("function"==typeof e){let t=e(i);return t?.required&&!t?.warningOnly}return!1}),m={...n},h=null;if(Array.isArray(v)&&$)h=v;else if(w&&(!(l||a)||$));else if(!a||w||$)if(r.isValidElement(v)){let t={...v.props,...m};if(t.id||(t.id=d),g||R.length>0||L.length>0||e.extra){let r=[];(g||R.length>0)&&r.push(`${d}_help`),e.extra&&r.push(`${d}_extra`),t["aria-describedby"]=r.join(" ")}R.length>0&&(t["aria-invalid"]="true"),p&&(t["aria-required"]="true"),(0,i5.supportRef)(v)&&(t.ref=F(c,v)),new Set([].concat((0,iP.default)((0,ln.toArray)(f)),(0,iP.default)((0,ln.toArray)(j)))).forEach(e=>{t[e]=(...t)=>{m[e]?.(...t),v.props[e]?.(...t)}});let n=[t["aria-required"],t["aria-invalid"],t["aria-describedby"]];h=r.createElement(lE,{control:m,update:v,childProps:n},(0,i7.cloneElement)(v,t))}else h=w&&(l||a)&&!$?v(i):v;return B(h,d,p)})};lD.useStatus=lr;var iG=iG;i4.Item=lD,i4.List=({prefixCls:e,children:t,...n})=>{let{getPrefixCls:o}=r.useContext(aN.ConfigContext),a=o("form",e),i=r.useMemo(()=>({prefixCls:a,status:"error"}),[a]);return r.createElement(iG.default,{...n},(e,n,o)=>r.createElement(aI.FormItemPrefixContext.Provider,{value:i},t(e.map(e=>({...e,fieldKey:e.key})),n,{errors:o.errors,warnings:o.warnings})))},i4.ErrorList=iK,i4.useForm=i1.default,i4.useFormInstance=function(){let{form:e}=r.useContext(aI.FormContext);return e},i4.useWatch=iQ.default,i4.Provider=aI.FormProvider;var lP=e.i(634505),lO=e.i(594666),lz=e.i(156968),lA=e.i(166857),lR=e.i(148461),lL=e.i(167536);e.i(757296);var lF=e.i(783571),lB=e.i(700425),lH=e.i(298549);let lW=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding-right: 12px;
        border-right: 1px solid ${t.colorBorderSecondary};
    `,searchBox:e`
        width: 240px;
        flex-shrink: 0;
    `,searchTrigger:e`
        width: 100%;
        height: 34px;
        border-radius: 10px;
        border: 1px solid ${t.colorBorderSecondary};
        background: ${t.colorFillSecondary};
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px 0 10px;
        color: ${t.colorTextSecondary};
        cursor: pointer;
        transition: all 0.18s ease;

        &:hover {
            border-color: ${t.colorBorder};
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,searchTriggerActive:e`
        border-color: ${t.colorPrimaryBorder};
        background: ${t.colorPrimaryBg};
        color: ${t.colorText};
    `,searchIcon:e`
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        opacity: 0.9;
    `,exchangeLogo:e`
        width: 16px;
        height: 16px;
        border-radius: 4px;
        object-fit: contain;
        flex-shrink: 0;
    `,searchValue:e`
        flex: 1;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
        color: inherit;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: left;
        letter-spacing: 0.1px;
    `,searchHint:e`
        font-size: 11px;
        color: ${t.colorTextTertiary};
        flex-shrink: 0;
    `,marketTypeBadge:e`
        font-size: 8px;
        font-weight: 500;
        line-height: 1;
        color: ${t.colorTextTertiary};
        flex-shrink: 0;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        margin-left: auto;
    `,symbolText:e`
        font-weight: 600;
        font-size: 14px;
        color: ${t.colorText};
    `,iconButton:e`
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: ${t.colorTextSecondary};
        
        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,avatar:e`
        margin-right: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    `,avatarButton:e`
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: transparent;
        color: ${t.colorText};
        font-size: 12px;
        font-weight: 700;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;

        &:hover {
            background: ${t.colorFillTertiary};
        }
    `,popoverContent:e`
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 260px;
    `,menuGroup:e`
        display: flex;
        flex-direction: column;
        gap: 2px;
    `,menuItem:e`
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        color: ${t.colorText};
        font-size: 13px;
        transition: all 0.15s ease;

        &:hover {
            background: ${t.colorFillTertiary};
        }
    `,menuIcon:e`
        width: 18px;
        height: 18px;
        color: ${t.colorTextSecondary};
        display: inline-flex;
        align-items: center;
        justify-content: center;
    `,menuLabel:e`
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
    `,menuRight:e`
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: ${t.colorTextSecondary};
        font-size: 12px;
    `,langOptionItem:e`
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 140px;
    `,langOptionLabel:e`
        flex: 1;
    `,langCheckIcon:e`
        flex-shrink: 0;
        opacity: 0;
    `,langCheckIconActive:e`
        opacity: 1;
    `,divider:e`
        height: 1px;
        background: ${"#fff"===t.colorText?"rgba(255, 255, 255, 0.15)":t.colorBorderSecondary};
        margin: 8px 0;
    `,popoverActions:e`
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
    `,linkReset:e`
        color: inherit;
        text-decoration: none;
        display: block;
    `,profileHeader:e`
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 4px 12px 4px;
    `,profileAvatar:e`
        width: 44px;
        height: 44px;
        border-radius: 12px;
        object-fit: cover;
    `,profileDetails:e`
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
    `,profileName:e`
        font-weight: 700;
        font-size: 15px;
        color: ${t.colorText};
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,profileHandle:e`
        font-size: 13px;
        color: ${t.colorTextSecondary};
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,planTag:e`
        background: ${t.colorFillSecondary};
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        color: ${t.colorTextSecondary};
        font-weight: 500;
        border: 1px solid ${t.colorBorderSecondary};
        max-width: 92px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 0;
    `,cancelRenewalItem:e`
        color: ${t.colorError};

        .anticon,
        svg {
            color: ${t.colorError};
        }
    `,renewalScheduledItem:e`
        cursor: default;
        color: ${t.colorTextSecondary};

        &:hover {
            background: transparent;
        }
    `,passwordModal:e`
        .ant-modal {
            background: transparent !important;
        }

        .ant-modal-content {
            background: transparent !important;
            border-radius: 14px !important;
            border: none !important;
            padding: 0 !important;
            overflow: hidden;
            box-shadow: none !important;
        }

        .ant-modal-body {
            padding: 0 !important;
        }
    `,passwordModalContent:e`
        display: flex;
        flex-direction: column;
        width: 100%;
        background: ${t.colorBgLayout};
        padding: 6px;
        gap: 8px;
        border-radius: 12px;
        border: 1px solid ${t.colorBorder};
        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
    `,passwordModalHeader:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px 0 6px;
    `,passwordModalTitle:e`
        font-size: 20px;
        font-weight: 700;
        color: ${t.colorText};
        letter-spacing: -0.02em;
        margin-top: 6px;
        margin-bottom: 2px;
        margin-left: 4px;
    `,passwordModalClose:e`
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${t.colorTextSecondary};
        transition: all 0.15s ease;

        &:hover {
            background: ${t.colorFill};
            color: ${t.colorText};
        }
    `,passwordModalPanel:e`
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 10px;
        background: ${t.colorBgContainer};
        padding: 14px 16px 4px;
    `,passwordForm:e`
        .ant-form-item {
            margin-bottom: 14px;
        }

        .ant-form-item-label {
            padding-bottom: 6px;
        }

        .ant-form-item-label > label {
            height: auto;
            font-size: 12px;
            font-weight: 600;
            color: ${t.colorTextSecondary};
        }

        .ant-input-affix-wrapper {
            border-radius: 8px;
            background: ${t.colorFillSecondary};
            border-color: ${t.colorBorderSecondary};
        }
    `,passwordModalFooter:e`
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 4px;
    `})),lU=(0,r.memo)(function(){let{styles:e}=lW(),{t:o}=(0,n.useTranslation)("workspace"),{user:a,isSignedIn:i}=(0,lz.useUser)(),{signOut:l}=(0,lz.useClerk)(),s=(0,lR.useThemeStore)(e=>e.themeMode),c=(0,eX.useSelectedSymbol)();(0,eX.useWatchlistStore)(e=>e.setSelectedSymbol);let u=(0,eX.useWatchlistStore)(e=>e.setWatchlistMarketType),d=(0,eX.useWatchlistMarketType)(),p=(0,eX.useQuoteAssets)(),f=(0,e0.useExchange)(),m=(0,eJ.getExchangeDefinition)(f),{isDrawingPanelActive:h,setDrawingPanelActive:g}=ed(),[y,b]=(0,r.useState)(!1),[x,v]=(0,r.useState)(!1),[w,S]=(0,r.useState)(!1),[k,j]=(0,r.useState)(!1),[$,C]=(0,r.useState)(null),[T,M]=(0,r.useState)("idle"),[N,E]=(0,r.useState)(!1),[I,D]=(0,r.useState)(!1),[P,O]=(0,r.useState)(""),[z]=i4.useForm();(0,r.useEffect)(()=>{let e=e=>{let t=e.target;"INPUT"!==t.tagName&&"TEXTAREA"!==t.tagName&&!t.isContentEditable&&!y&&(1!==e.key.length||e.ctrlKey||e.altKey||e.metaKey||(e.preventDefault(),O(e.key),b(!0)))};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[y]);let A=(0,eQ.useNavigateToSymbol)(),R=(0,r.useCallback)(e=>{let t="spot"===e.type?"spot":"futures";u(t),A(e.symbol,{exchange:e.exchange,marketType:t}),b(!1)},[A,u]),L=(0,r.useMemo)(()=>c?(0,rC.formatSymbolForDisplay)((0,rC.formatSymbolForChart)(c),d):o("symbolSearch.placeholder"),[c,d,o]),F=a?.firstName?.[0]??a?.username?.[0]??a?.primaryEmailAddress?.emailAddress?.[0]??"M",{currentLanguage:B,setLanguage:H,languages:W,meta:Y}=(0,lH.useLanguagePreference)(),_=(0,r.useMemo)(()=>W.map(r=>{let n=Y[r],o=r===B;return{key:r,label:(0,t.jsxs)("div",{className:e.langOptionItem,children:[(0,t.jsx)("span",{className:e.langOptionLabel,children:n.nativeName}),(0,t.jsx)(iN.Check,{size:14,className:`${e.langCheckIcon} ${o?e.langCheckIconActive:""}`})]}),onClick:()=>H(r)}}),[W,Y,B,H,e]),V=Y[B],q=i&&a?.passwordEnabled===!0,K=(0,r.useCallback)(async()=>{if(i){M("loading");try{let e=await fetch("/api/billing/summary",{method:"GET",credentials:"same-origin",headers:{Accept:"application/json"},cache:"no-store"}),t=await e.json().catch(()=>null);if(!e.ok||!t)throw Error("Billing summary request failed");C(t),M("ready")}catch{M("error")}}},[i]);(0,r.useEffect)(()=>{i||(C(null),M("idle"),E(!1))},[i]),(0,r.useEffect)(()=>{i&&"idle"===T&&K()},[T,i,K]);let X=(0,r.useCallback)(e=>{v(e),e&&i&&"loading"!==T&&K()},[T,i,K]),G=(0,r.useMemo)(()=>{if(!$?.renewal?.currentPeriodEnd)return null;let e=new Date($.renewal.currentPeriodEnd);return Number.isNaN(e.getTime())?null:new Intl.DateTimeFormat("tr"===B?"tr-TR":B,{day:"numeric",month:"long",year:"numeric"}).format(e)},[$?.renewal?.currentPeriodEnd,B]),Q=$?.plan.label??("error"===T?o("profileMenu.planUnavailable"):o("profileMenu.planLoading")),Z=(0,r.useCallback)(()=>{$?.renewal?.canCancel&&(v(!1),E(!0))},[$?.renewal?.canCancel]),J=(0,r.useCallback)(async()=>{D(!0);try{let e=await fetch("/api/billing/cancel-renewal",{method:"POST",credentials:"same-origin",headers:{Accept:"application/json","Content-Type":"application/json"},body:"{}"}),t=await e.json().catch(()=>null);if(!e.ok||!t)throw Error("Cancel renewal request failed");C(t),M("ready"),E(!1),lL.toast.success(o("profileMenu.cancelRenewalSuccess"))}catch{lL.toast.error(o("profileMenu.cancelRenewalFailed"))}finally{D(!1)}},[o]),ee=(0,r.useCallback)(()=>{z.resetFields(),v(!1),S(!0)},[z]),et=(0,r.useCallback)(()=>{k||(S(!1),z.resetFields())},[k,z]),er=(0,r.useCallback)(async()=>{if(a)try{let e=await z.validateFields();j(!0),await a.updatePassword({currentPassword:e.currentPassword,newPassword:e.newPassword}),lL.toast.success(o("passwordModal.updateSuccess")),S(!1),z.resetFields()}catch(e){if(e&&"object"==typeof e&&"errorFields"in e)return;lL.toast.error(e.errors?.[0]?.longMessage||e.errors?.[0]?.message||e.message||tr.default.t("workspace:passwordModal.updateFailed"))}finally{j(!1)}},[z,a,o]),en=(0,t.jsxs)("div",{className:e.popoverContent,children:[(0,t.jsxs)("div",{className:e.profileHeader,children:[i&&a?.imageUrl?(0,t.jsx)("img",{src:a.imageUrl,className:e.profileAvatar,alt:o("profileMenu.avatarAlt")}):(0,t.jsx)("div",{className:e.profileAvatar,style:{background:"var(--ant-color-fill-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"var(--ant-color-text)"},children:F}),(0,t.jsxs)("div",{className:e.profileDetails,children:[(0,t.jsx)("div",{className:e.profileName,children:a?.fullName||o("profileMenu.defaultName")}),(0,t.jsx)("div",{className:e.profileHandle,children:a?.username||a?.primaryEmailAddress?.emailAddress||""})]}),i&&(0,t.jsx)("div",{className:e.planTag,title:Q,"aria-label":o("profileMenu.currentPlan",{plan:Q}),children:Q})]}),$?.renewal&&(0,t.jsx)("div",{className:e.menuGroup,children:$.renewal.canCancel?(0,t.jsxs)("div",{className:`${e.menuItem} ${e.cancelRenewalItem}`,onClick:Z,role:"button",tabIndex:0,onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),Z())},children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iE,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.cancelRenewal")}),(0,t.jsx)("span",{className:e.menuRight,children:$.renewal.planLabel})]}):(0,t.jsxs)("div",{className:`${e.menuItem} ${e.renewalScheduledItem}`,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iE,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.renewalCancelled")}),G&&(0,t.jsx)("span",{className:e.menuRight,children:G})]})}),(0,t.jsxs)("div",{className:e.menuGroup,children:[(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iw,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.home")})]}),(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iS,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.helpCenter")})]})]}),(0,t.jsx)("div",{className:e.divider}),(0,t.jsxs)("div",{className:e.menuGroup,children:[(0,t.jsx)(lO.Dropdown,{menu:{items:_},trigger:["click"],destroyOnHidden:!0,children:(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iT.Languages,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.languagePreference")}),(0,t.jsx)("span",{className:e.menuRight,children:V.nativeName})]})}),(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(ik,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.darkMode")}),(0,t.jsx)("span",{className:e.menuRight,children:(0,t.jsx)(iI.Switch,{size:"small",checked:"dark"===s,onChange:e=>lR.useThemeStore.getState().setThemeMode(e?"dark":"light")})})]}),(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(ij,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.drawingPanel")}),(0,t.jsx)("span",{className:e.menuRight,children:(0,t.jsx)(iI.Switch,{size:"small",checked:h,onChange:g})})]}),(0,t.jsxs)("div",{className:e.menuItem,children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(i$,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.keyboardShortcuts")}),(0,t.jsx)("span",{className:e.menuRight,children:(0,t.jsx)(U.Hotkey,{keys:"ctrl+/"})})]}),q&&(0,t.jsxs)("div",{className:e.menuItem,onClick:ee,role:"button",tabIndex:0,onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),ee())},children:[(0,t.jsx)("span",{className:e.menuIcon,children:(0,t.jsx)(iM.KeyRound,{size:16})}),(0,t.jsx)("span",{className:e.menuLabel,children:o("profileMenu.changePassword")})]})]}),(0,t.jsx)("div",{className:e.divider}),(0,t.jsx)("div",{className:e.popoverActions,children:i?(0,t.jsx)(a3.Button,{danger:!0,block:!0,onClick:()=>{l(),lL.toast.success(o("profileMenu.signedOutSuccess"))},style:{borderRadius:8,fontWeight:600},children:o("profileMenu.signOut")}):lB.isClerkLoginDisabled?(0,t.jsx)(a3.Button,{block:!0,disabled:!0,children:o("profileMenu.stagingMode")}):(0,t.jsx)(lA.default,{href:"/signin",className:e.linkReset,children:(0,t.jsx)(a3.Button,{type:"primary",block:!0,children:o("profileMenu.signInJoinNow")})})})]});return(0,t.jsxs)("div",{className:e.container,children:[(0,t.jsx)("div",{className:e.avatar,children:(0,t.jsx)(rK.Popover,{content:en,trigger:"click",open:x,onOpenChange:X,placement:"bottomLeft",arrow:!1,overlayInnerStyle:{padding:12,borderRadius:12,marginTop:12},align:{offset:[-12,-56]},children:(0,t.jsx)("button",{type:"button",className:e.avatarButton,children:i?a?.imageUrl?(0,t.jsx)("img",{src:a.imageUrl,alt:a.fullName??o("profileMenu.profileAlt"),style:{width:32,height:32,borderRadius:999,objectFit:"cover"}}):F.toUpperCase():(0,t.jsx)(iC,{size:16})})})}),(0,t.jsx)("div",{className:e.searchBox,children:(0,t.jsxs)("button",{type:"button",className:`${e.searchTrigger} ${c?e.searchTriggerActive:""}`,onClick:()=>b(!0),title:o("symbolSearch.searchSymbolTooltip"),children:[(0,t.jsx)(eM.Search,{className:e.searchIcon}),(0,t.jsx)("img",{className:e.exchangeLogo,src:(0,eJ.getExchangeLogoUrl)(m.logoName),alt:m.displayName,title:m.displayName,width:16,height:16}),(0,t.jsx)("span",{className:e.searchValue,children:L}),(0,t.jsx)("span",{className:e.marketTypeBadge,title:"futures"===d?"FUTURES":"SPOT",children:"futures"===d?"FUTURES":"SPOT"})]})}),(0,t.jsx)(lF.SymbolSearchModal,{open:y,onClose:()=>{b(!1),O("")},onSelect:R,initialQuery:P,marketType:d,quoteAssets:p}),(0,t.jsx)(iD.Modal,{open:N,title:o("profileMenu.cancelRenewalTitle"),onCancel:()=>{I||E(!1)},onOk:()=>void J(),okText:o("profileMenu.cancelRenewalConfirm"),cancelText:o("profileMenu.keepRenewal"),okButtonProps:{danger:!0,loading:I},cancelButtonProps:{disabled:I},centered:!0,destroyOnHidden:!0,children:(0,t.jsx)("p",{children:o("profileMenu.cancelRenewalDescription",{date:G??o("profileMenu.currentPeriodEnd"),plan:$?.renewal?.planLabel??""})})}),(0,t.jsx)(iD.Modal,{className:e.passwordModal,open:w,onCancel:et,footer:null,width:"min(480px, 92vw)",centered:!0,closable:!1,maskStyle:{background:"rgba(0, 0, 0, 0.35)",backdropFilter:"blur(1px)",WebkitBackdropFilter:"blur(1px)"},destroyOnHidden:!0,children:(0,t.jsxs)("div",{className:e.passwordModalContent,children:[(0,t.jsxs)("div",{className:e.passwordModalHeader,children:[(0,t.jsx)("span",{className:e.passwordModalTitle,children:o("passwordModal.title")}),(0,t.jsx)("div",{className:e.passwordModalClose,onClick:et,role:"button",tabIndex:0,onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),et())},children:(0,t.jsx)(eb.X,{size:15})})]}),(0,t.jsx)("div",{className:e.passwordModalPanel,children:(0,t.jsxs)(i4,{form:z,layout:"vertical",requiredMark:!1,disabled:k,className:e.passwordForm,children:[(0,t.jsx)(i4.Item,{name:"currentPassword",label:o("passwordModal.currentPassword"),rules:[{required:!0,message:o("passwordModal.currentPasswordRequired")}],children:(0,t.jsx)(lP.Input.Password,{autoComplete:"current-password"})}),(0,t.jsx)(i4.Item,{name:"newPassword",label:o("passwordModal.newPassword"),rules:[{required:!0,message:o("passwordModal.newPasswordRequired")}],children:(0,t.jsx)(lP.Input.Password,{autoComplete:"new-password"})}),(0,t.jsx)(i4.Item,{name:"confirmNewPassword",label:o("passwordModal.confirmNewPassword"),dependencies:["newPassword"],rules:[{required:!0,message:o("passwordModal.confirmNewPasswordRequired")},({getFieldValue:e})=>({validator:(t,r)=>r&&e("newPassword")!==r?Promise.reject(Error(o("passwordModal.passwordsDoNotMatch"))):Promise.resolve()})],children:(0,t.jsx)(lP.Input.Password,{autoComplete:"new-password"})})]})}),(0,t.jsxs)("div",{className:e.passwordModalFooter,children:[(0,t.jsx)(a3.Button,{onClick:et,disabled:k,children:o("passwordModal.cancel")}),(0,t.jsx)(a3.Button,{type:"primary",loading:k,onClick:()=>void er(),children:o("passwordModal.update")})]})]})})]})});var lY=e.i(822560),l_=e.i(800633);let lV=(0,eq.create)()((0,l_.persist)(e=>({favorites:[...ir.DEFAULT_TIMEFRAME_FAVORITES],activeTf:"1m",toggleFavorite:t=>e(e=>({favorites:e.favorites.includes(t)?e.favorites.filter(e=>e!==t):[...e.favorites,t]})),setActiveTf:t=>e({activeTf:t})}),{name:"traderclub-timeframes",storage:(0,l_.createJSONStorage)(()=>G.coalescedLocalStorage)}));var lq=e.i(60500),lK=e.i(307216),lX=e.i(583989),lG=e.i(482751),lQ=e.i(614908),lZ=e.i(611092);let lJ=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 12px;
        border-right: 1px solid ${t.colorBorderSecondary};
        height: 100%;
    `,timeframeItem:e`
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        color: ${t.colorTextSecondary};
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        
        &:hover {
             background: ${t.colorFillTertiary};
             color: ${t.colorText};
        }
        
        &.active {
            color: ${t.colorInfoText};
            background: ${t.colorInfoBg};
        }
    `,iconButton:e`
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: ${t.colorTextSecondary};
        transition: all 0.2s ease;
        
        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }

        &.active {
            color: ${t.colorInfoText};
            background: ${t.colorInfoBg};
        }
    `,divider:e`
        width: 1px;
        height: 20px;
        background: ${t.colorBorderSecondary};
        margin: 0 4px;
    `,popoverContainer:e`
        width: 260px;
        max-height: 500px;
        overflow-y: auto;
        padding: 4px 0;

        &::-webkit-scrollbar {
            width: 4px;
        }
        &::-webkit-scrollbar-thumb {
            background: ${t.colorFillSecondary};
            border-radius: 10px;
        }
    `,categoryHeader:e`
        padding: 8px 12px 4px;
        font-size: 11px;
        font-weight: 700;
        color: ${t.colorTextQuaternary};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `,popoverItem:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 13px;
        color: ${t.colorText};
        transition: background 0.15s ease;

        &:hover {
            background: ${t.colorFillTertiary};
            
            .star-icon {
                opacity: 1;
            }
        }

        &.active {
            color: ${t.colorInfoText};
            background: ${t.colorFillTertiary};
        }
    `,iconLabel:e`
        display: flex;
        align-items: center;
        gap: 12px;
    `,starIcon:e`
        opacity: 0;
        color: ${t.colorTextQuaternary};
        transition: all 0.15s ease;
        padding: 4px;
        border-radius: 4px;

        &:hover {
            background: ${t.colorFillSecondary};
        }

        &.active {
            opacity: 1;
            color: ${t.colorWarningText};
        }
    `,popoverDivider:e`
        height: 1px;
        background: ${t.colorBorderSecondary};
        margin: 4px 0;
    `})),l0=["candle","ha","line","hlcArea","area"],l1={candle:lK.CandlesIcon,ha:lX.HeikinAshiIcon,line:lG.LineIcon,hlcArea:lQ.HlcAreaIcon,area:lZ.AreaIcon},l2=new Set(l0),l4=[{id:"1s",category:"SECONDS"},{id:"1m",category:"MINUTES"},{id:"3m",category:"MINUTES"},{id:"5m",category:"MINUTES"},{id:"15m",category:"MINUTES"},{id:"30m",category:"MINUTES"},{id:"1h",category:"HOURS"},{id:"2h",category:"HOURS"},{id:"4h",category:"HOURS"},{id:"6h",category:"HOURS"},{id:"8h",category:"HOURS"},{id:"12h",category:"HOURS"},{id:"1D",category:"DAYS"},{id:"1W",category:"WEEKS"},{id:"1M",category:"MONTHS"}],l6=e=>l4.map(({id:t,category:r})=>({id:t,label:e(`tactic.timeframes.${t}`),category:r,categoryLabel:e(`tactic.timeframeCategories.${r}`)})),l3=new Set(l4.map(e=>e.id)),l8=new Map(l4.map((e,t)=>[e.id,t])),l5=new Map(l0.map((e,t)=>[e,t])),l9=e=>{switch(e){case"1s":return"1s";case"1m":return"1m";case"3m":return"3m";case"5m":return"5m";case"15m":return"15m";case"30m":return"30m";case"1h":return"1H";case"2h":return"2H";case"4h":return"4H";case"6h":return"6H";case"8h":return"8H";case"12h":return"12H";case"1D":return"1D";case"1W":return"1W";case"1M":return"1M";default:return null}},l7=r.default.memo(function(){let{styles:e,cx:o}=lJ(),{t:a}=(0,n.useTranslation)("workspace"),i=r.default.useMemo(()=>l0.map(e=>({id:e,label:a(`tactic.chartTypes.${e}`),icon:l1[e]})),[a]);r.default.useMemo(()=>l6(a),[a]);let l=lV(e=>e.favorites),s=lV(e=>e.activeTf),c=(0,lq.useChartTypeStore)(e=>e.favorites),u=(0,lq.useChartTypeStore)(e=>e.activeChartType),d=(0,r$.useChartStore)(e=>e.syncedInterval),p=(0,r$.useChartStore)(e=>e.activePane),f=(0,r$.useChartStore)(e=>e.paneTimeframes),m=(0,r$.useChartStore)(e=>e.chartSyncSettings.syncInterval),h=f[`grid-${p}`],g=m?d:h??d;r.default.useEffect(()=>{let e=(e=>{switch(e){case"1H":return"1h";case"2H":return"2h";case"4H":return"4h";case"6H":return"6h";case"8H":return"8h";case"12H":return"12h";default:return e}})(g),t=l3.has(e)?e:"1m";s!==t&&lV.getState().setActiveTf(t),l3.has(e)||"1m"===g||r$.useChartStore.getState().setSyncedInterval("1m")},[g,s]),r.default.useEffect(()=>{l2.has(u)||lq.useChartTypeStore.getState().setActiveChartType("candle")},[u]);let y=(0,r.useCallback)(e=>{lV.getState().setActiveTf(e);let t=l9(e);t&&r$.useChartStore.getState().setSyncedInterval(t)},[]),b=(0,r.useCallback)((e,t)=>{e.stopPropagation(),lq.useChartTypeStore.getState().toggleFavorite(t)},[]),x=(0,t.jsx)("div",{className:e.popoverContainer,children:i.map(r=>{let n=r.icon,a=c.includes(r.id),i=u===r.id;return(0,t.jsxs)("div",{className:o(e.popoverItem,i&&"active"),onClick:()=>lq.useChartTypeStore.getState().setActiveChartType(r.id),children:[(0,t.jsxs)("div",{className:e.iconLabel,children:[(0,t.jsx)(n,{size:20}),(0,t.jsx)("span",{children:r.label})]}),(0,t.jsx)(lY.Star,{size:24,className:o(e.starIcon,"star-icon",a&&"active"),onClick:e=>b(e,r.id),fill:a?"currentColor":"none"})]},r.id)})}),v=i.find(e=>e.id===u)?.icon||lK.CandlesIcon,w=[...new Set([...l.filter(e=>l3.has(e)),...l3.has(s)?[s]:[]])].sort((e,t)=>(l8.get(e)??999)-(l8.get(t)??999));return(0,t.jsxs)("div",{className:e.container,children:[w.length>0?w.map(r=>(0,t.jsx)("div",{className:o(e.timeframeItem,s===r&&"active"),onClick:()=>y(r),children:r.endsWith("m")||r.endsWith("s")?r:r.endsWith("h")?r.toUpperCase():"1D"===r?"D":"1W"===r?"W":"1M"===r?"M":r},r)):(0,t.jsx)("div",{className:o(e.timeframeItem,"1m"===s&&"active"),onClick:()=>y("1m"),children:"1m"}),(0,t.jsx)(rK.Popover,{content:(0,t.jsx)(se,{}),trigger:"click",placement:"bottomLeft",overlayInnerStyle:{padding:0},arrow:!1,children:(0,t.jsx)("div",{className:e.iconButton,children:(0,t.jsx)(ek.ChevronDown,{size:14})})}),(0,t.jsx)("div",{className:e.divider}),c.filter(e=>l2.has(e)).sort((e,t)=>(l5.get(e)??999)-(l5.get(t)??999)).map(r=>{let n=i.find(e=>e.id===r);if(!n||!n.icon)return null;let a=n.icon;return(0,t.jsx)("div",{className:o(e.iconButton,u===r&&"active"),onClick:()=>lq.useChartTypeStore.getState().setActiveChartType(r),title:n.label,children:(0,t.jsx)(a,{size:20})},r)}),(0,t.jsx)(rK.Popover,{content:x,trigger:"click",placement:"bottomLeft",overlayInnerStyle:{padding:0},arrow:!1,children:(0,t.jsx)("div",{className:o(e.iconButton,!c.includes(u)&&"active"),children:c.includes(u)?(0,t.jsx)(ek.ChevronDown,{size:14}):(0,t.jsx)(v,{size:20})})})]})});function se(){let{styles:e,cx:o}=lJ(),{t:a}=(0,n.useTranslation)("workspace"),i=r.default.useMemo(()=>l6(a),[a]),l=lV(e=>e.favorites),s=lV(e=>e.activeTf),c=Array.from(new Set(i.map(e=>e.category)));return(0,t.jsx)("div",{className:e.popoverContainer,children:c.map(r=>(0,t.jsxs)("div",{children:[(0,t.jsx)("div",{className:e.categoryHeader,style:{padding:"8px 12px 4px",fontSize:11,fontWeight:700,opacity:.5,textTransform:"uppercase"},children:i.find(e=>e.category===r)?.categoryLabel??r}),i.filter(e=>e.category===r).map(r=>(0,t.jsxs)("div",{className:o(e.popoverItem,s===r.id&&"active"),onClick:()=>{var e;let t;return e=r.id,lV.getState().setActiveTf(e),void((t=l9(e))&&r$.useChartStore.getState().setSyncedInterval(t))},children:[(0,t.jsx)("span",{children:r.label}),(0,t.jsx)(lY.Star,{size:24,className:o(e.starIcon,"star-icon",l.includes(r.id)&&"active"),onClick:e=>{var t;return t=r.id,void(e.stopPropagation(),lV.getState().toggleFavorite(t))},fill:l.includes(r.id)?"currentColor":"none"})]},r.id))]},r))})}(0,o.createStyles)(({token:e})=>({}));var st=e.i(882251),sr=e.i(548808),sn=e.i(760424),so=e.i(985788),sa=e.i(373583),si=e.i(605035);let sl=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto; // Push to right
        padding: 0 12px;
    `,fpsCounter:e`
        font-size: 11px;
        font-weight: 600;
        font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        color: ${t.colorTextSecondary};
        padding: 4px 8px;
        border-radius: 6px;
        background: ${t.colorFillQuaternary};
        min-width: 52px;
        text-align: center;
        cursor: default;
        user-select: none;
    `,iconButton:e`
        width: 52px;
        height: 34px; // Rectangular shape (approx 3:2 or close to 16:9 look)
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: ${t.colorTextSecondary};
        border: 1px solid ${t.colorBorderSecondary};
        padding: 5px;
        background: ${t.colorBgContainer};
        transition: all 0.2s ease;
        
        &:hover {
            border-color: ${t.colorBorder};
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `,iconButtonDisabled:e`
        cursor: not-allowed;
        opacity: 0.45;
        pointer-events: none;

        &:hover {
            border-color: ${t.colorBorderSecondary};
            background: ${t.colorBgContainer};
            color: ${t.colorTextSecondary};
        }
    `})),ss=(0,r.memo)(function({className:e}){let{t:o}=(0,n.useTranslation)("workspace"),a=function(){let[e,t]=(0,r.useState)(0),n=(0,r.useRef)(0),o=(0,r.useRef)(performance.now());return(0,r.useEffect)(()=>{let e,r=a=>{n.current++;let i=a-o.current;i>=1e3&&(t(Math.round(1e3*n.current/i)),n.current=0,o.current=a),e=requestAnimationFrame(r)};return e=requestAnimationFrame(r),()=>cancelAnimationFrame(e)},[]),e}();return(0,t.jsxs)("div",{className:e,title:o("controls.framesPerSecond"),style:{color:a>=50?"#4caf50":a>=30?"#ff9800":"#f44336"},children:[a," FPS"]})});function sc(){let{styles:e,cx:o}=sl(),{t:a}=(0,n.useTranslation)("workspace"),[i,l]=(0,r.useState)(!1),s="1"===ew.default.env.NEXT_PUBLIC_SHOW_FPS,c="1"===ew.default.env.NEXT_PUBLIC_ENABLE_PERF_MARKS,{activeLayout:u,setActiveLayout:d}=(0,r$.useChartStore)((0,si.useShallow)(e=>({activeLayout:e.activeLayout,setActiveLayout:e.setActiveLayout}))),p=(0,eX.useUnavailablePlatformSymbol)(),f=(0,eX.useWatchlistStore)(e=>e.selectedSymbol),m=(0,eX.useSymbolsWithMainAsset)(),h=(0,rT.findSymbolAssetEntry)(f,m),g=!!(!p&&f&&m.length>0&&(0,sr.isListingCountdownTickerNeeded)(h?.listingDate??null,Date.now())),y=(0,sn.useListingCountdownNow)(g),b=(0,rT.shouldCollapseChartForSymbolState)(y,p,f,m),x=(0,r.useCallback)(e=>{d(e),l(!1)},[d]),v=(0,r.useMemo)(()=>(0,t.jsx)(so.ChartLayoutMenu,{onLayoutChange:x}),[x]);return(0,t.jsxs)("div",{className:e.container,children:[s&&(0,t.jsx)(ss,{className:e.fpsCounter}),c&&(0,t.jsx)(sa.PerfInspector,{}),(0,t.jsx)(rK.Popover,{content:v,trigger:"click",placement:"bottomRight",open:!b&&i,onOpenChange:b?void 0:l,destroyOnHidden:!0,arrow:!1,overlayInnerStyle:{padding:0,background:"transparent",boxShadow:"none"},children:(0,t.jsx)("div",{className:o(e.iconButton,b&&e.iconButtonDisabled),title:a(b?"controls.layoutUnavailable":"controls.layout"),"aria-disabled":b,children:(0,t.jsx)(so.GridIcon,{type:u})})}),(0,t.jsx)(st.ExchangeSwitcher,{})]})}var su=e.i(50975);let sd=(0,l.default)("bug",[["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",key:"uouzyp"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M21 21a4 4 0 0 0-3.81-4",key:"1b0z45"}],["path",{d:"M21 5a4 4 0 0 1-3.55 3.97",key:"5cxbf6"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M3 21a4 4 0 0 1 3.81-4",key:"1fjd4g"}],["path",{d:"M3 5a4 4 0 0 0 3.55 3.97",key:"1d7oge"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M9 7.13V6a3 3 0 1 1 6 0v1.13",key:"1vgav8"}]]),sp=(0,o.createStyles)(({css:e,token:t})=>({container:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding-left: 12px;
        border-left: 1px solid ${t.colorBorderSecondary};
    `,iconButton:e`
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: ${t.colorTextSecondary};
        
        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `}));function sf(){let{t:e}=(0,n.useTranslation)("common"),{styles:o}=sp(),[a,i]=(0,r.useState)(!1);return(0,t.jsxs)("div",{className:o.container,children:[(0,t.jsx)("div",{className:o.iconButton,title:e("bugReport.title"),role:"button",tabIndex:0,onClick:()=>i(!0),onKeyDown:e=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),i(!0))},children:(0,t.jsx)(sd,{size:18})}),(0,t.jsx)(su.BugReportModal,{open:a,onClose:()=>i(!1)})]})}let sm=(0,o.createStyles)(({css:e,token:t})=>({header:e`
        display: flex;
        align-items: center;
        padding: 0 16px;
        height: 56px;
        background: ${t.colorBgContainer};
        border-bottom: 1px solid ${t.colorBorderSecondary};
        position: relative;
        z-index: 1000;
        user-select: none;
    `,undoRedo:e`
        display: flex;
        align-items: center;
        padding: 0 8px;
        gap: 4px;
        color: ${t.colorTextSecondary};
    `,iconButton:e`
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        
        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }
    `})),sh=(0,r.memo)(function(){let{styles:e}=sm();return(0,t.jsxs)("header",{className:e.header,children:[(0,t.jsx)(lU,{}),(0,t.jsx)(l7,{}),(0,t.jsx)(sc,{}),(0,t.jsx)(sf,{})]})});e.i(794435);var sg=e.i(435495),sy=e.i(331346),sb=e.i(832967);let sx="/[exchange]/[marketType]/[[...symbol]]",sv=(0,r.memo)(function(){let e=(0,eX.useWatchlistStore)(e=>e.selectedSymbol),n=(0,r.useMemo)(()=>e?(0,rC.formatSymbolForChart)(e.trim()):"BTC/USDT",[e]),o=(0,r$.useChartStore)(e=>e.setPaneSymbol),a=(0,r.useRef)(n);return(0,r.useEffect)(()=>{if(a.current===n)return;a.current=n;let e=r$.useChartStore.getState();if(e.chartSyncSettings.syncSymbol)return;let t=e.activePane,r=`grid-${t}`;o(r,n),(0,ie.markPerfEvent)("scenario:symbol-change",{symbol:n,pane:r})},[n,o]),(0,r.useEffect)(()=>{o("grid-0",n)},[]),(0,t.jsx)(sg.Chart,{symbol:n,showHeader:!1,autosize:!0})}),sw=(0,o.createStyles)(({css:e,token:t})=>({pageWrapper:e`
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: ${t.colorBgLayout};
        position: relative;
        /* Dragging across the workspace (charts, panels, divider handles, legends)
         * was being hijacked into a native text/element selection that highlighted
         * everything. A trading terminal isn't a document, so suppress selection
         * workspace-wide — but keep real text inputs and the code editor selectable. */
        user-select: none;
        -webkit-user-select: none;
        & input,
        & textarea,
        & [contenteditable="true"],
        & [contenteditable=""],
        & .monaco-editor,
        & .monaco-editor * {
            user-select: text;
            -webkit-user-select: text;
        }
    `,header:e`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 56px;
        background: ${t.colorBgContainer};a
        border-bottom: 1px solid ${t.colorBorderSecondary};
        position: relative;
        z-index: 1000;
    `,logo:e`
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
        color: ${t.colorText};
    `,headerRight:e`
        display: flex;
        align-items: center;
        gap: 16px;
    `,pluginControls:e`
        display: flex;
        align-items: center;
        gap: 12px;
    `,mainContainer:e`
        display: flex;
        width: 100%;
        height: calc(100vh - 56px);
        overflow: hidden;
        position: relative;
    `,leftSidebar:e`
        box-sizing: border-box;
        width: 68px;
        height: 100%;
        background: ${t.colorBgContainer};
        border-right: 1px solid ${t.colorBorderSecondary};
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4px 0;
        gap: 0px;
        overflow: hidden;
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
        transition:
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.15s ease;

        &.hidden {
            /* Chart alanını aniden zıplatmadan düzgün animasyonla gizle */
            width: 0;
            border-right-color: transparent;
            transform: translateX(-68px);
            opacity: 0;
            pointer-events: none;
            padding: 0;
            gap: 0;
        }
    `,leftSidebarScroll:e`
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-left: 14px;
        padding-right: 2px;
        padding-bottom: 12px;
        
        &::-webkit-scrollbar {
            width: 0;
        }
    `,sidebarDivider:e`
        width: 36px;
        height: 1px;
        background: ${t.colorTextQuaternary};
        margin: 6px 0;
    `,sidebarBtn:e`
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }

        &.active {
            background: ${t.colorPrimary}20;
            color: ${t.colorPrimary};
            border: 1px solid ${t.colorPrimary};
            box-shadow: 0 0 0 1px ${t.colorPrimary}20;
        }

        &.danger:hover {
            background: ${a.RED}15;
            color: ${a.RED};
        }
    `,drawingSidebarBtn:e`
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${t.colorTextSecondary};
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;

        > svg {
            width: 21px;
            height: 21px;
        }

        &:hover {
            background: ${t.colorFillTertiary};
            color: ${t.colorText};
        }

        &.active {
            background: ${t.colorPrimary}20;
            color: ${t.colorPrimary};
            border: 1px solid ${t.colorPrimary};
            box-shadow: 0 0 0 1px ${t.colorPrimary}20;
        }

        &.danger:hover {
            background: ${a.RED}15;
            color: ${a.RED};
        }
    `,drawingSidebarBtnCompactIcon:e`
        > svg {
            width: 16px;
            height: 16px;
        }
    `,toolButtonRow:e`
        width: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2px;
        box-sizing: border-box;
    `,flyoutButtonRow:e`
        width: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2px;
        box-sizing: border-box;

        &:hover .flyout-trigger,
        .flyout-trigger.flyout-open {
            opacity: 1;
            pointer-events: auto;
        }
    `,drawingToolRowOnTop:e`
        position: relative;
        z-index: 200;
    `,drawingToolRowSlot:e`
        width: 52px;
        box-sizing: border-box;
        flex-shrink: 0;
    `,flyoutTrigger:e`
        width: 11px;
        height: 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${t.colorTextQuaternary};
        transition: all 0.2s;
        opacity: 0;
        pointer-events: none;

        &:hover {
            color: ${t.colorTextSecondary};
            background: ${t.colorFillTertiary};
        }

        &.flyout-open {
            color: ${t.colorPrimary};
            background: ${t.colorPrimary}15;
        }
    `,flyoutSpacer:e`
        width: 11px;
        height: 20px;
        flex-shrink: 0;
        opacity: 0;
    `,flyoutChevron:e`
        color: inherit;
        opacity: 0.95;
        transition: opacity 0.2s;

        &.open {
            opacity: 1;
        }
    `,rightSidebar:e`
        width: 56px;
        height: 100%;
        background: ${t.colorBgContainer};
        border-left: 1px solid ${t.colorBorderSecondary};
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 0;
        gap: 16px;
    `,workspace:e`
        position: relative;
        flex: 1;
        height: 100%;
        overflow: hidden;
        background: ${t.colorBgLayout};
    `,gridOverlay:e`
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(to right, ${t.colorBorderSecondary}20 1px, transparent 1px),
            linear-gradient(to bottom, ${t.colorBorderSecondary}20 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
    `,panel:e`
        position: absolute;
        background: ${t.colorBgContainer};
        border: 1px solid ${t.colorBorderSecondary};
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        user-select: none;
        -webkit-user-select: none;
        /* GPU acceleration for smooth transforms */
        transform: translateZ(0);
        backface-visibility: hidden;

        &:hover {
            border-color: ${t.colorPrimary}40;
        }
    `,panelDragging:e`
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        border-color: ${t.colorPrimary};
        cursor: grabbing;
        will-change: transform;
        
        /* Disable pointer events on content during drag to prevent expensive re-renders */
        & > *:not(:first-child) {
            pointer-events: none;
        }
    `,panelHeader:e`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 28px;
        display: flex;
        align-items: center;
        padding: 0 8px;
        z-index: 100;
        border-radius: 8px 8px 0 0;
        background: ${t.colorFillTertiary};
    `,panelTitle:e`
        font-size: 11px;
        font-weight: 600;
        color: ${t.colorText};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        user-select: none;
    `,panelContent:e`
        position: absolute;
        inset: 0;
        overflow: hidden;
        border-radius: 12px;
    `,resizeHandle:e`
        position: absolute;
        background: transparent;

        &.active, &:active {
            background: ${t.colorPrimary};
            opacity: 0.5;
        }

        /* Top / Bottom */
        &.n { top: -3px; left: 0; right: 0; height: 6px; cursor: ns-resize; }
        &.s { bottom: -3px; left: 0; right: 0; height: 6px; cursor: ns-resize; }

        /* Left / Right */
        &.w { left: -3px; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
        &.e { right: -3px; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }

        /* Corners */
        &.nw { top: -3px; left: -3px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 25; }
        &.ne { top: -3px; right: -3px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 25; }
        &.sw { bottom: -3px; left: -3px; width: 12px; height: 12px; cursor: nesw-resize; z-index: 25; }
        &.se { bottom: -3px; right: -3px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 25; }
    `,snapGuide:e`
        position: absolute;
        background: ${a.GREEN};
        z-index: 9999;
        pointer-events: none;

        &.vertical {
            width: 2px;
            height: 100%;
        }

        &.horizontal {
            width: 100%;
            height: 2px;
        }
    `,contextMenu:e`
        position: fixed;
        background: #1e1e1e;
        border: 1px solid #333;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border-radius: 12px;
        padding: 8px;
        z-index: 10000;
        min-width: 190px;
        animation: fadeIn 0.15s cubic-bezier(0.2, 0, 0, 1);

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(-4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
    `,snapLayoutGrid:e`
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
    `,snapOption:e`
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        background: #252525;
        border: 1px solid transparent;

        &:hover {
            background: #2f2f2f;
            border-color: #444;
            transform: translateY(-1px);
        }

        .preview-box {
            width: 100%;
            height: 36px;
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            display: flex;
        }

        .active-part {
            position: absolute;
            background: #c0c0c0;
            border-radius: 2px;
            border: 1px solid #1e1e1e;
        }

        .inactive-part {
             background: #3a3a3a;
             border: 1px solid #1e1e1e;
        }

        span {
            display: none; /* Hide labels for compactness */
        }
    `,menuItem:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 4px;
        color: ${t.colorText};
        font-size: 13px;
        transition: all 0.15s;

        &:hover {
            background: ${t.colorFillSecondary};
        }

        svg {
            color: ${t.colorTextSecondary};
        }
    `})),sS=(0,r.memo)(function(){let e,t,n,o,a,i;return e=(0,sy.useRouter)(),t=(0,eX.useWatchlistStore)(e=>e.exchange),n=(0,eX.useWatchlistStore)(e=>e.watchlistMarketType),o=(0,eX.useWatchlistStore)(e=>e.selectedSymbol),a=(0,eX.useWatchlistStore)(e=>e.workspaceUrlSyncFromStore),i=(0,eX.useWatchlistStore)(e=>e.disableWorkspaceUrlSyncFromStore),(0,r.useEffect)(()=>{var r;if(!e.isReady||e.pathname!==sx||!a||!o||!t||"spot"!==n&&"futures"!==n)return;let l="string"==typeof e.query.exchange?(0,eJ.normalizeExchange)(e.query.exchange):null,s=(0,eJ.normalizeExchange)(t),c="string"==typeof e.query.marketType?(0,sb.normalizeMarketType)(e.query.marketType):null,u=Array.isArray(r=e.query.symbol)?r[0]??null:"string"==typeof r?r:null,d=(0,sb.normalizeRouteSymbol)(o),p=u?(0,sb.normalizeRouteSymbol)(u):null;l===s&&c===n&&p===d?i():e.replace({pathname:sx,query:{exchange:s,marketType:n,symbol:[d]}},`/${s}/${n}/${d}`,{shallow:!0})},[e,t,n,o,a,i]),null}),sk=(0,r.memo)(function({styleBundle:e,children:r}){let{isDrawingPanelActive:n}=ed();return(0,t.jsx)("div",{className:`${e.styles.leftSidebar} ${!n?"hidden":""}`,children:r})}),sj=(0,r.memo)(function(){let{isCalendarOpen:e}=ep();return e?(0,t.jsx)(a6,{}):null}),s$=(0,r.memo)(function(){let{isScriptEditorOpen:e}=ef(),[n,o]=(0,r.useState)(e);return(0,r.useEffect)(()=>{e&&o(!0)},[e]),n?(0,t.jsx)(iv,{}):null}),sC=(0,r.memo)(function({styleBundle:e}){let{styles:o,cx:a}=e,{t:i}=(0,n.useTranslation)("workspace"),{activeRightPanel:l,toggleRightPanel:s}=em(),{isScriptEditorOpen:c,setScriptEditorOpen:u}=ef(),{isBotChatOpen:m,setBotChatOpen:h}=eh(),{isSymbolInfoOpen:g,setSymbolInfoOpen:b}=eg(),x=(0,r.useCallback)(()=>{u(!1)},[u]);return(0,t.jsxs)("div",{className:o.rightSidebar,children:[(0,t.jsx)("div",{className:a(o.sidebarBtn,"watchlist"===l&&"active"),title:i("panels.watchlist"),"aria-label":i("panels.watchlist"),onClick:()=>{x(),s("watchlist")},children:(0,t.jsx)(d,{size:20})}),(0,t.jsx)("div",{style:{flex:1}}),(0,t.jsx)("div",{className:a(o.sidebarBtn,c&&"active"),title:i("panels.indicators"),"aria-label":i("panels.indicators"),onClick:e=>{e.stopPropagation(),u(!c)},children:(0,t.jsx)(f,{size:20})}),(0,t.jsx)("div",{className:a(o.sidebarBtn,m&&"active"),title:i("panels.botFeed"),"aria-label":i("panels.botFeed"),onClick:()=>{x();let e=!m;h(e),e&&null===l&&s("watchlist")},children:(0,t.jsx)(p,{size:20})}),(0,t.jsx)("div",{className:a(o.sidebarBtn,g&&"active"),title:i("panels.symbolInfo"),"aria-label":i("panels.symbolInfo"),onClick:()=>{x();let e=!g;b(e),e&&null===l&&s("watchlist")},children:(0,t.jsx)(y.Info,{size:20})})]})});function sT({title:e}){let o=sw(),{styles:a,cx:l}=o,{t:d}=(0,n.useTranslation)("workspace");(0,ie.useRenderPerf)("WorkspaceCoreInner",33),(0,r.useEffect)(()=>{if(!e)return;let t=document.title;return document.title=e,()=>{document.title=t}},[e]),(0,r.useEffect)(()=>{(0,ie.markPerfEvent)("scenario:workspace-load",{component:"WorkspaceCoreInner"})},[]),(0,r.useEffect)(()=>{let e=e=>{let t=e.target;if(t?.isContentEditable||t?.tagName==="INPUT"||t?.tagName==="TEXTAREA"||"ArrowLeft"!==e.key&&"ArrowRight"!==e.key)return;let{chartScrollHandlers:r}=r$.useChartStore.getState();0!==r.length&&(e.preventDefault(),"ArrowLeft"===e.key?r.forEach(e=>e.scrollLeft()):r.forEach(e=>e.scrollRight()))};return window.addEventListener("keydown",e,!0),()=>window.removeEventListener("keydown",e,!0)},[]);let p=(0,X.useDrawingToolsStore)(e=>e.activeButtonId),f=(0,X.useDrawingToolsStore)(e=>e.activeTool),y=(0,X.useDrawingToolsStore)(e=>e.setActiveTool),W=(0,X.useDrawingToolsStore)(e=>e.setDrawingToolFromFlyout),U=(0,X.useDrawingToolsStore)(e=>e.activeToolByButton),Y=(0,X.useDrawingToolsStore)(e=>e.isMagnetEnabled),_=(0,X.useDrawingToolsStore)(e=>e.isLocked),V=(0,X.useDrawingToolsStore)(e=>e.isHidden),q=(0,X.useDrawingToolsStore)(e=>e.isContinueMode),G=(0,X.useDrawingToolsStore)(e=>e.toggleMagnet),Q=(0,X.useDrawingToolsStore)(e=>e.toggleLock),Z=(0,X.useDrawingToolsStore)(e=>e.toggleHide),J=(0,X.useDrawingToolsStore)(e=>e.toggleContinueMode),ee=(0,X.useDrawingToolsStore)(e=>e.removeAll),et=(0,r$.useChartStore)(e=>e.chartSyncSettings.syncDrawings),er=(0,r$.useChartStore)(e=>e.toggleSyncSetting),[en,eo]=(0,r.useState)(null),ea=(0,r.useMemo)(()=>({trend:[{title:d("drawingTools.groups.lines"),items:[{id:"TrendLine",name:d("drawingTools.items.TrendLine"),icon:(0,t.jsx)(O.TrendLineIcon,{size:18})},{id:"Ray",name:d("drawingTools.items.Ray"),icon:(0,t.jsx)(z.RayIcon,{size:18})},{id:"ExtendedLine",name:d("drawingTools.items.ExtendedLine"),icon:(0,t.jsx)(A.ExtendedLineIcon,{size:18})},{id:"HorizontalLine",name:d("drawingTools.items.HorizontalLine"),icon:(0,t.jsx)(R.HorizontalLineIcon,{size:18})},{id:"HorizontalRay",name:d("drawingTools.items.HorizontalRay"),icon:(0,t.jsx)(L.HorizontalRayIcon,{size:18})},{id:"VerticalLine",name:d("drawingTools.items.VerticalLine"),icon:(0,t.jsx)(F.VerticalLineIcon,{size:18})},{id:"CrossLine",name:d("drawingTools.items.CrossLine"),icon:(0,t.jsx)(B.CrossLineIcon,{size:18})}]}],fib:[{title:d("drawingTools.groups.advanced"),items:[{id:"FibRetracement",name:d("drawingTools.items.FibRetracement"),icon:(0,t.jsx)(b.FibonacciIcon,{size:18})},{id:"ParallelChannel",name:d("drawingTools.items.ParallelChannel"),icon:(0,t.jsx)(H.ParallelChannelIcon,{size:18})}]}],prediction:[{title:d("drawingTools.groups.tools"),items:[{id:"Measurement",name:d("drawingTools.items.Measurement"),icon:(0,t.jsx)(x.MeasureIcon,{size:18})},{id:"PriceRange",name:d("drawingTools.items.PriceRange"),icon:(0,t.jsx)(v.PriceRangeIcon,{size:18})},{id:"LongShortPosition",name:d("drawingTools.items.LongShortPosition"),icon:(0,t.jsx)(w.LongShortPositionIcon,{size:18})}]}],brush:[{title:d("drawingTools.groups.brushTools"),items:[{id:"Brush",name:d("drawingTools.items.Brush"),icon:(0,t.jsx)(S.BrushIcon,{size:18})},{id:"Highlighter",name:d("drawingTools.items.Highlighter"),icon:(0,t.jsx)(k.HighlighterIcon,{size:18})},{id:"Path",name:d("drawingTools.items.Path"),icon:(0,t.jsx)(j.PathIcon,{size:18})}]}],shapes:[{title:d("drawingTools.groups.shapes"),items:[{id:"Rectangle",name:d("drawingTools.items.Rectangle"),icon:(0,t.jsx)(m.Square,{size:16})},{id:"Circle",name:d("drawingTools.items.Circle"),icon:(0,t.jsx)(h.Circle,{size:16})},{id:"Triangle",name:d("drawingTools.items.Triangle"),icon:(0,t.jsx)(g.Triangle,{size:16})}]}],text:[{title:d("drawingTools.groups.annotation"),items:[{id:"Text",name:d("drawingTools.items.Text"),icon:(0,t.jsx)($.TextIcon,{size:18})},{id:"Callout",name:d("drawingTools.items.Callout"),icon:(0,t.jsx)($.TextIcon,{size:18})}]}]}),[d]),ei=(0,r.useCallback)((e,t)=>{W(e,t)},[W]),el=(0,r.useCallback)((e,t)=>{e.preventDefault(),e.stopPropagation(),(ea[t]?.length??0)>0&&eo(t)},[ea]),es=(0,r.useMemo)(()=>{let e=[];return Object.values(ea).forEach(t=>{t.forEach(t=>{t.items.forEach(t=>{e.push([t.id,t.icon])})})}),Object.fromEntries(e)},[ea]),ec=(0,r.useCallback)(e=>en===e||p===e&&"cursor"!==f,[en,p,f]),eu=(0,r.useMemo)(()=>[{id:"cursor",toolType:"cursor",icon:(0,t.jsx)(C.DotIcon,{size:24}),title:d("drawingTools.buttons.cursor"),group:1},{id:"trend",toolType:"TrendLine",icon:(0,t.jsx)(T.TrendLineIcon,{size:24}),title:d("drawingTools.buttons.trend"),group:1,hasFlyout:!0},{id:"fib",toolType:"FibRetracement",icon:(0,t.jsx)(b.FibonacciIcon,{size:24}),title:d("drawingTools.buttons.fib"),group:1,hasFlyout:!0},{id:"prediction",toolType:"Measurement",icon:(0,t.jsx)(x.MeasureIcon,{size:24}),title:d("drawingTools.buttons.prediction"),group:1,hasFlyout:!0},{id:"brush",toolType:"Brush",icon:(0,t.jsx)(S.BrushIcon,{size:24}),title:d("drawingTools.buttons.brush"),group:1,hasFlyout:!0},{id:"shapes",toolType:"Rectangle",icon:(0,t.jsx)(M.PatternIcon,{size:24}),title:d("drawingTools.buttons.shapes"),group:1,hasFlyout:!0},{id:"text",toolType:"Text",icon:(0,t.jsx)($.TextIcon,{size:24}),title:d("drawingTools.buttons.text"),group:1,hasFlyout:!0}],[d]),ed=(0,r.useMemo)(()=>(0,t.jsx)(N.RemoveIcon,{size:26}),[]);return(0,t.jsxs)("div",{className:a.pageWrapper,children:[(0,t.jsx)(sS,{}),(0,t.jsx)(sh,{}),(0,t.jsxs)("div",{className:a.mainContainer,children:[(0,t.jsx)(sk,{styleBundle:o,children:(0,t.jsxs)("div",{className:a.leftSidebarScroll,children:[eu.map((e,n)=>{let o=n>0&&eu[n-1].group!==e.group;return e.hasFlyout?(0,t.jsxs)(r.default.Fragment,{children:[o&&(0,t.jsx)("div",{className:a.sidebarDivider}),(0,t.jsx)(K,{isOpen:en===e.id,onOpenChange:t=>eo(t?e.id:null),onSelectTool:t=>ei(e.id,t),activeToolId:U[e.id],toolGroups:ea[e.id],showFavorites:!0,rootClassName:ec(e.id)?a.drawingToolRowOnTop:void 0,triggerElement:(0,t.jsx)(i.Tooltip,{title:e.title,placement:"right",children:(0,t.jsxs)("div",{className:a.flyoutButtonRow,onContextMenu:t=>el(t,e.id),children:[(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${p===e.id?"active":""}`,onClick:t=>{t.stopPropagation(),y(U[e.id]??e.toolType,e.id)},children:es[U[e.id]]??e.icon}),(0,t.jsx)("div",{className:`flyout-trigger ${a.flyoutTrigger} ${en===e.id?"flyout-open":""}`,onClick:t=>{t.stopPropagation(),eo(t=>t===e.id?null:e.id)},children:(0,t.jsx)(u.ChevronRight,{size:10,className:l(a.flyoutChevron,en===e.id&&"open")})})]})})})]},e.id):(0,t.jsxs)(r.default.Fragment,{children:[o&&(0,t.jsx)("div",{className:a.sidebarDivider}),(0,t.jsx)("div",{className:l(a.drawingToolRowSlot,ec(e.id)&&a.drawingToolRowOnTop),children:(0,t.jsx)(i.Tooltip,{title:e.title,placement:"right",children:(0,t.jsxs)("div",{className:a.toolButtonRow,onContextMenu:e=>{e.preventDefault(),e.stopPropagation()},children:[(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${p===e.id?"active":""}`,onClick:()=>y(e.toolType,e.id),children:e.icon}),(0,t.jsx)("div",{className:a.flyoutSpacer})]})})})]},e.id)}),(0,t.jsx)("div",{className:a.sidebarDivider}),(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${q?"active":""}`,title:d("toolbar.stayInDrawingMode"),"aria-label":d("toolbar.stayInDrawingMode"),onClick:J,children:(0,t.jsx)(E.ContinueIcon,{size:26})}),(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${Y?"active":""}`,title:d("toolbar.magnetMode"),"aria-label":d("toolbar.magnetMode"),"aria-pressed":Y,onClick:G,children:(0,t.jsx)(I.MagnetIcon,{size:26})}),(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${_?"active":""}`,title:_?d("toolbar.unlockAllTools"):d("toolbar.lockAllTools"),"aria-label":_?d("toolbar.unlockAllTools"):d("toolbar.lockAllTools"),onClick:Q,children:(0,t.jsx)(D.LockIcon,{size:26})}),(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} ${V?"active":""}`,title:V?d("toolbar.showAllDrawings"):d("toolbar.hideAllDrawings"),"aria-label":V?d("toolbar.showAllDrawings"):d("toolbar.hideAllDrawings"),onClick:Z,children:(0,t.jsx)(P.HideIcon,{size:26})}),(0,t.jsx)("div",{className:l(a.drawingSidebarBtn,a.drawingSidebarBtnCompactIcon,et&&"active"),title:et?d("toolbar.syncDrawingsOn"):d("toolbar.syncDrawingsOff"),"aria-label":et?d("toolbar.syncDrawingsOn"):d("toolbar.syncDrawingsOff"),onClick:()=>er("syncDrawings"),children:(0,t.jsx)(c,{strokeWidth:2})}),(0,t.jsx)("div",{className:l(a.drawingSidebarBtn,a.drawingSidebarBtnCompactIcon),title:d("toolbar.centerToolbarOnChart"),"aria-label":d("toolbar.centerToolbarOnChart"),onClick:()=>{r$.useChartStore.getState().resetDrawingToolbarPositionHandlers.forEach(e=>e())},children:(0,t.jsx)(s,{strokeWidth:2})}),(0,t.jsx)("div",{className:a.sidebarDivider}),(0,t.jsx)("div",{className:`${a.drawingSidebarBtn} danger`,title:d("toolbar.removeAllDrawings"),"aria-label":d("toolbar.removeAllDrawings"),onClick:ee,children:ed})]})}),(0,t.jsx)("div",{className:a.workspace,children:(0,t.jsx)(sv,{})}),(0,t.jsx)(rL,{}),(0,t.jsx)(sj,{}),(0,t.jsx)(s$,{}),(0,t.jsx)(sC,{styleBundle:o})]})]})}let sM=(0,r.memo)(function(e){return(0,t.jsx)(eu,{children:(0,t.jsx)(sT,{...e})})});sM.displayName="WorkspaceCore",e.s(["WorkspaceCore",0,sM],412654);let sN=null,sE=[{id:"chart-main",x:0,y:0,width:1200,height:800,zIndex:1,title:"Chart",isMaximized:!1}],sI=(0,eq.create)()((0,l_.persist)((e,t)=>({panels:sE,maxZIndex:5,pluginState:{},setPanelPosition:(t,r,n)=>{e(e=>({panels:e.panels.map(e=>e.id===t?{...e,x:r,y:n}:e)}))},setPanelSize:(t,r,n)=>{e(e=>({panels:e.panels.map(e=>e.id===t?{...e,width:r,height:n}:e)}))},setPanelBounds:(t,r,n,o,a)=>{e(e=>({panels:e.panels.map(e=>e.id===t?{...e,x:r,y:n,width:o,height:a}:e)}))},bringToFront:r=>{let n=t().maxZIndex+1;e(e=>({maxZIndex:n,panels:e.panels.map(e=>e.id===r?{...e,zIndex:n}:e)}))},updatePanel:(t,r)=>{e(e=>({panels:e.panels.map(e=>e.id===t?{...e,...r}:e)}))},updatePanelState:(r,n)=>{e(e=>({panels:e.panels.map(e=>e.id===r?{...e,state:{...e.state,...n}}:e)}));let o=t().panels.find(e=>e.id===r);o&&(!sN&&(sN=new BroadcastChannel("traderclub-panel-sync")),sN).postMessage({type:"PANEL_STATE_UPDATE",panelId:r,state:o.state})},toggleMaximize:(r,n)=>{let o=t(),a=o.panels.find(e=>e.id===r);if(!a)return;let i=o.maxZIndex+1;if(a.isMaximized){let t=a.prevBounds||{x:50,y:50,width:400,height:300};e(e=>({panels:e.panels.map(e=>e.id===r?{...e,x:t.x,y:t.y,width:t.width,height:t.height,isMaximized:!1,zIndex:i}:e),maxZIndex:i}))}else e(e=>({panels:e.panels.map(e=>e.id===r?{...e,prevBounds:{x:e.x,y:e.y,width:e.width,height:e.height},x:0,y:0,width:n.width,height:n.height,isMaximized:!0,zIndex:i}:e),maxZIndex:i}))},resetLayout:()=>{e({panels:sE,maxZIndex:5})},addPanel:r=>{if(t().panels.some(e=>e.id===r.id))return void console.warn("[Workspace] Panel already exists, skipping add:",r.id);let n=t().maxZIndex+1;e(e=>({panels:[...e.panels,{...r,zIndex:n}],maxZIndex:n}))},removePanel:t=>{e(e=>({panels:e.panels.filter(e=>e.id!==t)}))},setPluginEnabled:(t,r)=>{e(e=>({pluginState:{...e.pluginState,[t]:{...e.pluginState[t],enabled:r}}}))},setPluginData:(t,r)=>{e(e=>({pluginState:{...e.pluginState,[t]:{...e.pluginState[t],data:r}}}))},isPluginEnabled:e=>t().pluginState[e]?.enabled??!0}),{name:"workspace-layout-v2"}));e.s([],627812);let sD=(0,l.default)("magnet",[["path",{d:"m12 15 4 4",key:"lnac28"}],["path",{d:"M2.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.029-6.029a1 1 0 1 1 3 3l-6.029 6.029a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l6.365-6.367A1 1 0 0 0 8.716 4.282z",key:"nlhkjb"}],["path",{d:"m5 8 4 4",key:"j6kj7e"}]]),sP=(0,o.createStyles)(({css:e,token:t})=>({snapToggle:e`
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: ${t.colorBgElevated};
        border-radius: 6px;
        border: 1px solid ${t.colorBorderSecondary};
    `,snapToggleLabel:e`
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: ${t.colorText};
    `,snapGuide:e`
        position: absolute;
        background: ${a.GREEN};
        z-index: 9999;
        pointer-events: none;
        
        &.vertical {
            width: 2px;
            height: 100%;
        }
        
        &.horizontal {
            width: 100%;
            height: 2px;
        }
    `}));function sO({guides:e}){return null}e.s(["createMagneticSnapPlugin",0,function(){let e=null;function o(){let{styles:e}=sP(),{t:r}=(0,n.useTranslation)("workspace"),{isPluginEnabled:o,setPluginEnabled:a}=sI(),l=o("magneticSnap");return(0,t.jsx)(i.Tooltip,{title:r(l?"plugins.magneticSnapEnabled":"plugins.magneticSnapDisabled"),children:(0,t.jsxs)("div",{className:e.snapToggle,children:[(0,t.jsxs)("span",{className:e.snapToggleLabel,children:[(0,t.jsx)(sD,{size:16}),r("plugins.snap")]}),(0,t.jsx)(iI.Switch,{size:"small",checked:l,onChange:e=>a("magneticSnap",e)})]})})}function a({draggingPanel:n}){let[o,i]=(0,r.useState)([]);return e=i,!n&&o.length>0&&i([]),(0,t.jsx)(sO,{guides:o})}return{id:"magneticSnap",name:tr.default.t("workspace:plugins.magneticSnap"),defaultEnabled:!0,onDragMove:t=>{let r=function(e,t,r,n){let o=r.filter(t=>t.id!==e.id),a=[],{x:i,y:l}=t,s=i,c=i+e.width,u=l,d=l+e.height,p=null;if(20>Math.abs(s)){let e=Math.abs(s);(null===p||e<p.distance)&&(p={distance:e,snappedPos:0,guidePos:0})}if(20>Math.abs(c-n.width)){let t=Math.abs(c-n.width);(null===p||t<p.distance)&&(p={distance:t,snappedPos:n.width-e.width,guidePos:n.width-2})}for(let t of o){let r=t.x,n=t.x+t.width;if(20>Math.abs(s-n)){let e=Math.abs(s-n);(null===p||e<p.distance)&&(p={distance:e,snappedPos:n,guidePos:n})}if(20>Math.abs(c-r)){let t=Math.abs(c-r);(null===p||t<p.distance)&&(p={distance:t,snappedPos:r-e.width,guidePos:r})}if(20>Math.abs(s-r)){let e=Math.abs(s-r);(null===p||e<p.distance)&&(p={distance:e,snappedPos:r,guidePos:r})}if(20>Math.abs(c-n)){let t=Math.abs(c-n);(null===p||t<p.distance)&&(p={distance:t,snappedPos:n-e.width,guidePos:n})}}let f=null;if(20>Math.abs(u)){let e=Math.abs(u);(null===f||e<f.distance)&&(f={distance:e,snappedPos:0,guidePos:0})}if(20>Math.abs(d-n.height)){let t=Math.abs(d-n.height);(null===f||t<f.distance)&&(f={distance:t,snappedPos:n.height-e.height,guidePos:n.height-2})}for(let t of o){let r=t.y,n=t.y+t.height;if(20>Math.abs(u-n)){let e=Math.abs(u-n);(null===f||e<f.distance)&&(f={distance:e,snappedPos:n,guidePos:n})}if(20>Math.abs(d-r)){let t=Math.abs(d-r);(null===f||t<f.distance)&&(f={distance:t,snappedPos:r-e.height,guidePos:r})}if(20>Math.abs(u-r)){let e=Math.abs(u-r);(null===f||e<f.distance)&&(f={distance:e,snappedPos:r,guidePos:r})}if(20>Math.abs(d-n)){let t=Math.abs(d-n);(null===f||t<f.distance)&&(f={distance:t,snappedPos:n-e.height,guidePos:n})}}return p&&(i=p.snappedPos,a.push({type:"vertical",position:p.guidePos})),f&&(l=f.snappedPos,a.push({type:"horizontal",position:f.guidePos})),{position:{x:i,y:l},guides:a}}(t.panel,t.currentPosition,t.allPanels,t.workspaceSize);return r.guides,e?.(r.guides),{position:r.position,showGuides:r.guides}},onDragEnd:()=>(e?.([]),!1),renderOverlay:({draggingPanel:e})=>(0,t.jsx)(a,{draggingPanel:e},"magnetic-snap-overlay"),renderHeaderControls:()=>(0,t.jsx)(o,{},"snap-toggle")}}],601681);var sz=e.i(440894),sA=e.i(631591),sR=e.i(590859),sL=e.i(332599),sF=e.i(81379),sB=r,sH=e.i(952502);function sW(e,t){if("function"==typeof e)return e(t);null!=e&&(e.current=t)}class sU extends sB.Component{getSnapshotBeforeUpdate(e){let t=this.props.childRef.current;if(t&&e.isPresent&&!this.props.isPresent&&!1!==this.props.pop){let e=t.offsetParent,r=(0,sF.isHTMLElement)(e)&&e.offsetWidth||0,n=(0,sF.isHTMLElement)(e)&&e.offsetHeight||0,o=this.props.sizeRef.current;o.height=t.offsetHeight||0,o.width=t.offsetWidth||0,o.top=t.offsetTop,o.left=t.offsetLeft,o.right=r-o.width-o.left,o.bottom=n-o.height-o.top}return null}componentDidUpdate(){}render(){return this.props.children}}function sY({children:e,isPresent:n,anchorX:o,anchorY:a,root:i,pop:l}){let s=(0,sB.useId)(),c=(0,sB.useRef)(null),u=(0,sB.useRef)({width:0,height:0,top:0,left:0,right:0,bottom:0}),{nonce:d}=(0,sB.useContext)(sH.MotionConfigContext),p=function(...e){return r.useCallback(function(...e){return t=>{let r=!1,n=e.map(e=>{let n=sW(e,t);return r||"function"!=typeof n||(r=!0),n});if(r)return()=>{for(let t=0;t<n.length;t++){let r=n[t];"function"==typeof r?r():sW(e[t],null)}}}}(...e),e)}(c,e.props?.ref??e?.ref);return(0,sB.useInsertionEffect)(()=>{let{width:e,height:t,top:r,left:p,right:f,bottom:m}=u.current;if(n||!1===l||!c.current||!e||!t)return;let h="left"===o?`left: ${p}`:`right: ${f}`,g="bottom"===a?`bottom: ${m}`:`top: ${r}`;c.current.dataset.motionPopId=s;let y=document.createElement("style");d&&(y.nonce=d);let b=i??document.head;return b.appendChild(y),y.sheet&&y.sheet.insertRule(`
          [data-motion-pop-id="${s}"] {
            position: absolute !important;
            width: ${e}px !important;
            height: ${t}px !important;
            ${h}px !important;
            ${g}px !important;
          }
        `),()=>{b.contains(y)&&b.removeChild(y)}},[n]),(0,t.jsx)(sU,{isPresent:n,childRef:c,sizeRef:u,pop:l,children:!1===l?e:sB.cloneElement(e,{ref:p})})}let s_=({children:e,initial:n,isPresent:o,onExitComplete:a,custom:i,presenceAffectsLayout:l,mode:s,anchorX:c,anchorY:u,root:d})=>{let p=(0,sA.useConstant)(sV),f=(0,r.useId)(),m=!0,h=(0,r.useMemo)(()=>(m=!1,{id:f,initial:n,isPresent:o,custom:i,onExitComplete:e=>{for(let t of(p.set(e,!0),p.values()))if(!t)return;a&&a()},register:e=>(p.set(e,!1),()=>p.delete(e))}),[o,p,a]);return l&&m&&(h={...h}),(0,r.useMemo)(()=>{p.forEach((e,t)=>p.set(t,!1))},[o]),r.useEffect(()=>{o||p.size||!a||a()},[o]),e=(0,t.jsx)(sY,{pop:"popLayout"===s,isPresent:o,anchorX:c,anchorY:u,root:d,children:e}),(0,t.jsx)(sL.PresenceContext.Provider,{value:h,children:e})};function sV(){return new Map}var sq=e.i(857613);let sK=e=>e.key||"";function sX(e){let t=[];return r.Children.forEach(e,e=>{(0,r.isValidElement)(e)&&t.push(e)}),t}let sG=({children:e,custom:n,initial:o=!0,onExitComplete:a,presenceAffectsLayout:i=!0,mode:l="sync",propagate:s=!1,anchorX:c="left",anchorY:u="top",root:d})=>{let[p,f]=(0,sq.usePresence)(s),m=(0,r.useMemo)(()=>sX(e),[e]),h=s&&!p?[]:m.map(sK),g=(0,r.useRef)(!0),y=(0,r.useRef)(m),b=(0,sA.useConstant)(()=>new Map),x=(0,r.useRef)(new Set),[v,w]=(0,r.useState)(m),[S,k]=(0,r.useState)(m);(0,sR.useIsomorphicLayoutEffect)(()=>{g.current=!1,y.current=m;for(let e=0;e<S.length;e++){let t=sK(S[e]);h.includes(t)?(b.delete(t),x.current.delete(t)):!0!==b.get(t)&&b.set(t,!1)}},[S,h.length,h.join("-")]);let j=[];if(m!==v){let e=[...m];for(let t=0;t<S.length;t++){let r=S[t],n=sK(r);h.includes(n)||(e.splice(t,0,r),j.push(r))}return"wait"===l&&j.length&&(e=j),k(sX(e)),w(m),null}let{forceRender:$}=(0,r.useContext)(sz.LayoutGroupContext);return(0,t.jsx)(t.Fragment,{children:S.map(e=>{let r=sK(e),v=(!s||!!p)&&(m===S||h.includes(r));return(0,t.jsx)(s_,{isPresent:v,initial:(!g.current||!!o)&&void 0,custom:n,presenceAffectsLayout:i,mode:l,root:d,onExitComplete:v?void 0:()=>{if(x.current.has(r)||(x.current.add(r),!b.has(r)))return;b.set(r,!0);let e=!0;b.forEach(t=>{t||(e=!1)}),e&&($?.(),k(y.current),s&&f?.(),a&&a())},anchorX:c,anchorY:u,children:e},r)})})},sQ=(0,o.createStyles)(({css:e,token:t})=>({edgeZonePreview:e`
        position: absolute;
        background: ${t.colorPrimary}20;
        border: 2px solid ${t.colorPrimary};
        border-radius: 8px;
        z-index: 9998;
        pointer-events: none;
        transition: all 0.15s ease;
    `}));function sZ(e,t){let r=window.innerWidth,n=window.innerHeight,o=e<30,a=e>r-30,i=t<30,l=t>n-30;return i&&o?"topLeft":i&&a?"topRight":l&&o?"bottomLeft":l&&a?"bottomRight":o?"left":a?"right":null}function sJ({zone:e,workspaceSize:r}){let{styles:n}=sQ(),o=function(e,t){if(!e)return null;let r=t.width/2,n=t.height/2;switch(e){case"left":return{left:0,top:0,width:r,height:t.height};case"right":return{left:r,top:0,width:r,height:t.height};case"maximize":return{left:0,top:0,width:t.width,height:t.height};case"topLeft":return{left:0,top:0,width:r,height:n};case"topRight":return{left:r,top:0,width:r,height:n};case"bottomLeft":return{left:0,top:n,width:r,height:n};case"bottomRight":return{left:r,top:n,width:r,height:n};default:return null}}(e,r);return(0,t.jsx)(sG,{children:e&&o&&(0,t.jsx)(eV.motion.div,{className:n.edgeZonePreview,initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.95},style:o})})}e.s(["createEdgeZonesPlugin",0,function(){let e=null,n=null;return{id:"edgeZones",name:tr.default.t("workspace:plugins.edgeZones"),defaultEnabled:!0,onDragMove:t=>{let r=sZ(t.mousePosition.x,t.mousePosition.y);r!==e&&(e=r,n?.(r))},onDragEnd:t=>{let r=sZ(t.mousePosition.x,t.mousePosition.y);if(e=null,n?.(null),r){let{setPanelBounds:e}=sI.getState(),{workspaceSize:n,panel:o}=t,a=n.width/2,i=n.height/2;switch(r){case"left":return e(o.id,0,0,a,n.height),!0;case"right":return e(o.id,a,0,a,n.height),!0;case"maximize":return e(o.id,0,0,n.width,n.height),!0;case"topLeft":return e(o.id,0,0,a,i),!0;case"topRight":return e(o.id,a,0,a,i),!0;case"bottomLeft":return e(o.id,0,i,a,i),!0;case"bottomRight":return e(o.id,a,i,a,i),!0}}return!1},renderOverlay:({draggingPanel:e,workspaceSize:r})=>(0,t.jsx)(o,{draggingPanel:e,workspaceSize:r},"edge-zones-overlay")};function o({draggingPanel:a,workspaceSize:i}){let[l,s]=(0,r.useState)(e);return(0,r.useEffect)(()=>(n=s,()=>{n=null}),[]),(0,t.jsx)(sJ,{zone:l,workspaceSize:i})}}],343805);let s0=(0,o.createStyles)(({css:e,token:t})=>({splitPreview:e`
        position: absolute;
        background: ${t.colorWarning}25;
        border: 2px solid ${t.colorWarning};
        border-radius: 4px;
        z-index: 9997;
        pointer-events: none;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 12px ${t.colorWarning}40;
    `,targetPanel:e`
        position: absolute;
        border: 2px solid ${t.colorWarning};
        border-radius: 8px;
        pointer-events: none;
        z-index: 9996;
    `}));function s1({target:e}){let{styles:r}=s0(),n=e?function(e,t=56){let{panelBounds:r,zone:n}=e;switch(n){case"left":return{left:r.x,top:r.y,width:r.width/2,height:r.height};case"right":return{left:r.x+r.width/2,top:r.y,width:r.width/2,height:r.height};case"top":return{left:r.x,top:r.y,width:r.width,height:r.height/2};case"bottom":return{left:r.x,top:r.y+r.height/2,width:r.width,height:r.height/2};default:return{}}}(e):{};return(0,t.jsx)(sG,{mode:"wait",children:e&&e.zone&&(0,t.jsx)(eV.motion.div,{className:r.splitPreview,layout:!0,initial:{opacity:0,scale:.95},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.95},transition:{layout:{type:"spring",stiffness:400,damping:30},opacity:{duration:.15}},style:n},`split-${e.panelId}-${e.zone}`)})}e.s(["createSplitDockingPlugin",0,function(){let e=null,n=null,o=null,a=null,i=0,l=0;function s({draggingPanel:e,allPanels:o}){let[i,l]=(0,r.useState)(n);return(0,r.useEffect)(()=>(a=l,()=>{a=null}),[]),e||null===i||l(null),(0,t.jsx)(s1,{target:i})}return{id:"splitDocking",name:tr.default.t("workspace:plugins.splitDocking"),defaultEnabled:!0,onDragMove:t=>{let r=t.mousePosition.x,s=t.mousePosition.y,c=Math.abs(s-l);if(5>Math.abs(r-i)&&c<5)return{overlay:!!n};i=r,l=s;let u=function(e,t,r,n,o=0){for(let o=n.length-1;o>=0;o--){let a=n[o];if(a.id===r)continue;let i=a.x,l=a.x+a.width,s=a.y,c=a.y+a.height;if(e>=i&&e<=l&&t>=s&&t<=c){let r=a.width,n=a.height,o=(e-i)/r,l=(t-s)/n,c=null,u=1-o,d=1-l,p=Math.min(o,u,l,d);if(p<.35&&(p===o?c="left":p===u?c="right":p===l?c="top":p===d&&(c="bottom")),c||(p===o?c="left":p===u?c="right":p===l?c="top":p===d&&(c="bottom")),c)return{panelId:a.id,zone:c,panelBounds:{x:a.x,y:a.y,width:a.width,height:a.height}}}}return null}(r,s,t.panel.id,t.allPanels);return(u?.panelId!==e?.panelId||u?.zone!==e?.zone)&&(o&&(clearTimeout(o),o=null),e=u,n=null,a?.(null),u&&(o=setTimeout(()=>{n=u,a?.(u)},400))),{overlay:!!n}},onDragEnd:t=>{o&&(clearTimeout(o),o=null);let r=n;if(e=null,n=null,a?.(null),r&&r.zone){let{setPanelBounds:e}=sI.getState(),{panelBounds:n,zone:o,panelId:a}=r,i=t.panel.id;switch(o){case"left":return e(i,n.x,n.y,n.width/2,n.height),e(a,n.x+n.width/2,n.y,n.width/2,n.height),!0;case"right":return e(a,n.x,n.y,n.width/2,n.height),e(i,n.x+n.width/2,n.y,n.width/2,n.height),!0;case"top":return e(i,n.x,n.y,n.width,n.height/2),e(a,n.x,n.y+n.height/2,n.width,n.height/2),!0;case"bottom":return e(a,n.x,n.y,n.width,n.height/2),e(i,n.x,n.y+n.height/2,n.width,n.height/2),!0}}return!1},renderOverlay:({draggingPanel:e,allPanels:r})=>(0,t.jsx)(s,{draggingPanel:e,allPanels:r},"split-docking-overlay")}}],421097);var s2=e.i(977815);function s4(){let{t:e}=(0,n.useTranslation)("workspace"),{isTaskViewActive:o,setTaskViewActive:a}=function(){let e=(0,r.useContext)(Q);if(!e)throw Error("useWorkspaceTaskViewContext must be used within WorkspaceProvider");return{isTaskViewActive:e.isTaskViewActive,setTaskViewActive:e.setTaskViewActive}}();return(0,t.jsx)(r_.Button,{icon:(0,t.jsx)(s2.LayoutGrid,{size:16}),onClick:()=>a(!o),type:o?"primary":"text",title:e("taskView.tooltip")})}(0,o.createStyles)(({css:e,token:t})=>({overlay:e`
        position: absolute;
        inset: 0;
        background: rgba(20, 20, 30, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 100;
        pointer-events: auto;
    `}));let s6={id:"task-view",name:tr.default.t("workspace:plugins.taskView"),renderHeaderControls:()=>(0,t.jsx)(s4,{},"task-view-header"),renderOverlay:()=>null,transformPanelLayout:({panel:e,allPanels:t,workspaceSize:r,index:n,taskView:o})=>{if(!o?.isActive)return;let a=t.length,{width:i,height:l}=r;if(0===i||0===l)return{opacity:0,scale:.01};let{cols:s,rows:c,cellWidth:u,cellHeight:d,startX:p,startY:f,gap:m}=function(e,t,r){let n,o;if(0===e||0===t||0===r)return{cols:1,rows:1,cellWidth:0,cellHeight:0,startX:0,startY:0,gap:20};1===e?(n=1,o=1):2===e?(n=2,o=1):3===e?(n=3,o=1):4===e?(n=2,o=2):e<=6?(n=3,o=2):e<=9?(n=3,o=3):(n=4,o=Math.ceil(e/4));let a=(t-120-(n-1)*20)/n,i=(r-120-(o-1)*20)/o;return{cols:n,rows:o,cellWidth:a,cellHeight:i,startX:60,startY:60,gap:20}}(a,i,l),h=0,g=0;t.forEach(e=>{h=Math.max(h,e.width||400),g=Math.max(g,e.height||300)});let y=Math.min(.85*u/h,.85*d/g,.7),b=Math.floor(n/s),x=b===c-1?a-b*s:s,v=p;return x<s&&(v=p+(s*u+(s-1)*m-(x*u+(x-1)*m))/2),{x:v+n%s*(u+m)+(u-(e.width||400)*y)/2,y:f+b*(d+m)+(d-(e.height||300)*y)/2,scale:y,zIndex:500+n,opacity:1}},getPanelProps:({taskView:e,bringToFront:t,panel:r})=>{if(e?.isActive)return{onClick:n=>{n.stopPropagation(),e.setActive&&e.setActive(!1),t?.(r.id)},style:{cursor:"pointer",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden"}}}};e.s(["createTaskViewPlugin",0,()=>s6],124605)}]);