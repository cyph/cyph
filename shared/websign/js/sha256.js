var Sha256;

try {
	if ('webkitSubtle' in crypto) {
		crypto.subtle	= crypto.webkitSubtle;
	}

	Sha256	= function (data, callback) {
		crypto.subtle.digest('SHA-256', sodium.from_string(data)).then(function (data) {
			callback(sodium.to_hex(new Uint8Array(data)));
		});
	};

	Sha256('test', function () {
		/* It works! */
	});
}
catch (_) {
	(function () {
		/* https://github.com/dchest/fast-sha256-js */
		!function(t,i){"undefined"!=typeof module&&module.exports?module.exports=i():t.sha256=i()}(this,function(){"use strict";function t(t,i,n,r,s){for(var h,f,u,o,a,l,p,v,b,c,w,y,d;s>=64;){for(h=i[0],f=i[1],u=i[2],o=i[3],a=i[4],l=i[5],p=i[6],v=i[7],c=0;16>c;c++)w=r+4*c,t[c]=(255&n[w])<<24|(255&n[w+1])<<16|(255&n[w+2])<<8|255&n[w+3];for(c=16;64>c;c++)b=t[c-2],y=(b>>>17|b<<15)^(b>>>19|b<<13)^b>>>10,b=t[c-15],d=(b>>>7|b<<25)^(b>>>18|b<<14)^b>>>3,t[c]=(y+t[c-7]|0)+(d+t[c-16]|0);for(c=0;64>c;c++)y=(((a>>>6|a<<26)^(a>>>11|a<<21)^(a>>>25|a<<7))+(a&l^~a&p)|0)+(v+(e[c]+t[c]|0)|0)|0,d=((h>>>2|h<<30)^(h>>>13|h<<19)^(h>>>22|h<<10))+(h&f^h&u^f&u)|0,v=p,p=l,l=a,a=o+y|0,o=u,u=f,f=h,h=y+d|0;i[0]+=h,i[1]+=f,i[2]+=u,i[3]+=o,i[4]+=a,i[5]+=l,i[6]+=p,i[7]+=v,r+=64,s-=64}return r}function i(){this.v=new Uint32Array(8),this.w=new Int32Array(64),this.buf=new Uint8Array(128),this.buflen=0,this.len=0,this.reset()}function n(t){var n,e=new Uint8Array(64);if(t.length>64)(new i).update(t).finish(e);else for(n=0;n<t.length;n++)e[n]=t[n];for(this.inner=new i,this.outer=new i,n=0;64>n;n++)e[n]^=54;for(this.inner.update(e),n=0;64>n;n++)e[n]^=106;for(this.outer.update(e),this.istate=new Uint32Array(8),this.ostate=new Uint32Array(8),n=0;8>n;n++)this.istate[n]=this.inner.v[n],this.ostate[n]=this.outer.v[n];for(n=0;n<e.length;n++)e[n]=0}var e=new Uint32Array([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]);i.prototype.reset=function(){this.v[0]=1779033703,this.v[1]=3144134277,this.v[2]=1013904242,this.v[3]=2773480762,this.v[4]=1359893119,this.v[5]=2600822924,this.v[6]=528734635,this.v[7]=1541459225,this.buflen=0,this.len=0},i.prototype.clean=function(){var t;for(t=0;t<this.buf.length;t++)this.buf[t]=0;for(t=0;t<this.w.length;t++)this.w[t]=0;this.reset()},i.prototype.update=function(i,n){var e=0,r="undefined"!=typeof n?n:i.length;if(this.len+=r,this.buflen>0){for(;this.buflen<64&&r>0;)this.buf[this.buflen++]=i[e++],r--;64===this.buflen&&(t(this.w,this.v,this.buf,0,64),this.buflen=0)}for(r>=64&&(e=t(this.w,this.v,i,e,r),r%=64);r>0;)this.buf[this.buflen++]=i[e++],r--;return this},i.prototype.finish=function(i){var n,e=this.len,r=this.buflen,s=e/536870912|0,h=e<<3,f=56>e%64?64:128;for(this.buf[r]=128,n=r+1;f-8>n;n++)this.buf[n]=0;for(this.buf[f-8]=s>>>24&255,this.buf[f-7]=s>>>16&255,this.buf[f-6]=s>>>8&255,this.buf[f-5]=s>>>0&255,this.buf[f-4]=h>>>24&255,this.buf[f-3]=h>>>16&255,this.buf[f-2]=h>>>8&255,this.buf[f-1]=h>>>0&255,t(this.w,this.v,this.buf,0,f),n=0;8>n;n++)i[4*n+0]=this.v[n]>>>24&255,i[4*n+1]=this.v[n]>>>16&255,i[4*n+2]=this.v[n]>>>8&255,i[4*n+3]=this.v[n]>>>0&255;return this},n.prototype.reset=function(){for(var t=0;8>t;t++)this.inner.v[t]=this.istate[t],this.outer.v[t]=this.ostate[t];this.inner.len=this.outer.len=64,this.inner.buflen=this.outer.buflen=0},n.prototype.clean=function(){for(var t=0;8>t;t++)this.ostate[t]=this.istate[t]=0;this.inner.clean(),this.outer.clean()},n.prototype.update=function(t){return this.inner.update(t),this},n.prototype.finish=function(t){return this.inner.finish(t),this.outer.update(t,32).finish(t),this};var r=function(t){var n=new Uint8Array(32);return(new i).update(t).finish(n).clean(),n};return r.hmac=function(t,i){var e=new Uint8Array(32);return new n(t).update(i).finish(e).clean(),e},r.pbkdf2=function(t,i,e,r){var s,h,f,u=new Uint8Array(4),o=new Uint8Array(32),a=new Uint8Array(32),l=new Uint8Array(r),p=new n(t);for(s=0;r>32*s;s++){for(f=s+1,u[0]=f>>>24&255,u[1]=f>>>16&255,u[2]=f>>>8&255,u[3]=f>>>0&255,p.reset(),p.update(i),p.update(u),p.finish(a),h=0;32>h;h++)o[h]=a[h];for(h=2;e>=h;h++)for(p.reset(),p.update(a).finish(a),f=0;32>f;f++)o[f]^=a[f];for(h=0;32>h&&r>32*s+h;h++)l[32*s+h]=o[h]}for(s=0;32>s;s++)o[s]=a[s]=0;for(s=0;4>s;s++)u[s]=0;return p.clean(),l},r});

		Sha256	= function (data, callback) {
			callback(sodium.to_hex(sha256(sodium.from_string(data))));
		};
	}());
}
