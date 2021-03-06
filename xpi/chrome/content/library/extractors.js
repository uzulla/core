var Extractors;
this.Extractors = Extractors = Tombfix.Service.extractors = new Repository([
	{
		name : 'LDR',
		getItem : function(ctx, getOnly){
			if(ctx.host != 'reader.livedoor.com' && ctx.host != 'fastladder.com')
				return;
			
			var item  = $x('ancestor-or-self::div[starts-with(@id, "item_count")]', ctx.target);
			if(!item)
				return;
			
			var channel = $x('id("right_body")/div[@class="channel"]//a');
			var res = {
				author : ($x('div[@class="item_info"]/*[@class="author"]/text()', item) || '').extract(/by (.*)/),
				title  : $x('div[@class="item_header"]//a/text()', item) || '',
				feed   : channel.textContent,
				href   : $x('(div[@class="item_info"]/a)[1]/@href', item).replace(/[?&;](fr?(om)?|track|ref|FM)=(r(ss(all)?|df)|atom)([&;].*)?/,'') || channel.href,
			};
			
			var uri = createURI(res.href);
			if(!getOnly){
				ctx.title = res.feed + (res.title? ' - ' + res.title : '');
				ctx.href  = res.href;
				ctx.host  = uri.host;
			}
			
			return res
		},
	},
	
	{
		name : 'Quote - LDR',
		ICON : 'http://reader.livedoor.com/favicon.ico',
		check : function(ctx){
			return Extractors.LDR.getItem(ctx, true) && ctx.selection;
		},
		extract : function(ctx){
			Extractors.LDR.getItem(ctx);
			return Extractors.Quote.extract(ctx);
		},
	},
	
	{
		name : 'ReBlog - LDR',
		ICON : 'http://reader.livedoor.com/favicon.ico',
		check : function(ctx){
			var item = Extractors.LDR.getItem(ctx, true);
			return item && (
				item.href.match('^http://.*?\\.tumblr\\.com/') ||
				(ctx.onImage && ctx.target.src.match('^http://data\.tumblr\.com/')));
		},
		extract : function(ctx){
			Extractors.LDR.getItem(ctx);
			return Extractors.ReBlog.extractByLink(ctx, ctx.href);
		},
	},
	
	{
		name : 'Photo - LDR(FFFFOUND!)',
		ICON : 'http://reader.livedoor.com/favicon.ico',
		check : function(ctx){
			var item = Extractors.LDR.getItem(ctx, true);
			return item &&
				ctx.onImage &&
				item.href.match('^http://ffffound\\.com/');
		},
		extract : function(ctx){
			var item = Extractors.LDR.getItem(ctx);
			ctx.title = item.title;
			
			with(createURI(ctx.href))
				ctx.href = prePath + filePath;
			
			return {
				type      : 'photo',
				item      : item.title,
				itemUrl   : ctx.target.src.replace(/_m(\..{3})/, '$1'),
				author    : item.author,
				authorUrl : 'http://ffffound.com/home/' + item.author + '/found/',
				favorite : {
					name : 'FFFFOUND',
					id   : ctx.href.split('/').pop(),
				},
			};
		},
	},
	
	{
		name : 'Photo - LDR',
		ICON : 'http://reader.livedoor.com/favicon.ico',
		check : function(ctx){
			return Extractors.LDR.getItem(ctx, true) &&
				ctx.onImage;
		},
		extract : function(ctx){
			Extractors.LDR.getItem(ctx);
			return Extractors.check(ctx)[0].extract(ctx);
		},
	},
	
	{
		name : 'Link - LDR',
		ICON : 'http://reader.livedoor.com/favicon.ico',
		check : function(ctx){
			return Extractors.LDR.getItem(ctx, true);
		},
		extract : function(ctx){
			Extractors.LDR.getItem(ctx);
			return Extractors.Link.extract(ctx);
		},
	},
	
	{
		name : 'Quote - Twitter',
		ICON : Models.Twitter.ICON,
		check : function(ctx){
			return ctx.href.match('//twitter.com/.*?/(status|statuses)/\\d+');
		},
		extract : function(ctx){
			return {
				type     : 'quote',
				item     : ctx.title.substring(0, ctx.title.indexOf(': ')),
				itemUrl  : ctx.href,
				body     : createFlavoredString(ctx.selection? 
					ctx.window.getSelection() : 
					ctx.document.querySelector('.js-tweet-text') || 
					ctx.document.querySelector('.tweet-text-large') || 
					ctx.document.querySelector('.entry-content')),
				favorite : {
					name : 'Twitter',
					id   : ctx.href.match(/(status|statuses)\/(\d+)/)[2],
				},
			}
		},
	},
	
	{
		name : 'Quote - inyo.jp',
		ICON : 'chrome://tombfix/skin/quote.png',
		check : function(ctx){
			return ctx.href.match('//inyo.jp/quote/[a-f0-9]+');
		},
		extract : function(ctx){
			return {
				type     : 'quote',
				item     : $x('//span[@class="title"]/text()'),
				itemUrl  : ctx.href,
				body     : createFlavoredString((ctx.selection)? 
					ctx.window.getSelection() : $x('//blockquote[contains(@class, "text")]/p')),
			}
		},
	},
	
	{
		name : 'Amazon',
		getAsin : function(ctx){
			return $x('id("ASIN")/@value');
		},
		normalizeUrl : function(host, asin){
			return  'http://' + host + '/o/ASIN/' + asin + 
				(this.affiliateId ? '/' + this.affiliateId + '/ref=nosim' : '');
		},
		get affiliateId(){
			return getPref('amazonAffiliateId');
		},
		preCheck : function(ctx){
			return ctx.host.match(/amazon\./) && this.getAsin(ctx);
		},
		extract : function(ctx){
			// 日本に特化(comの取得方法不明)
			var date = new Date(ctx.document.body.innerHTML.extract('発売日：.*?</b>.*?([\\d/]+)'));
			if(!isNaN(date))
				ctx.date = date;
			
			ctx.href = this.normalizeUrl(ctx.host, this.getAsin(ctx));
			
			var elmTitle = $x('id("btAsinTitle")');
			if(!elmTitle)
				return
			
			var authors = $x([
				'id("handleBuy")/div[@class="buying"]/span//a/text()',
				'id("handleBuy")/div[@class="buying"]/a/text()'
			].join('|'), currentDocument(), true);
			
			ctx.title = 'Amazon: ' + 
				elmTitle.textContent + 
				(authors.length? ': ' + authors.join(', ') : '');
		},
	},
	
	{
		name : 'Photo - Amazon',
		ICON : 'http://www.amazon.com/favicon.ico',
		check : function(ctx){
			return Extractors.Amazon.preCheck(ctx) && 
				($x('./ancestor::*[@id="prodImageCell" or @id="prodImageOuter" or @id="image-block-widget"]', ctx.target) || ctx.target.id == 'magnifierLens');
		},
		extract : function(ctx){
			Extractors.Amazon.extract(ctx);
			
			var d = new Deferred();
			
			// 拡大レンズなど画像以外の要素か?
			if(!ctx.target.src)
				ctx.target = $x('id("prodImageCell")/img | id("main-image") | id("original-main-image")');
			
			// tools4hack
			// http://tools4hack.santalab.me/new-ipad-get-largeartwork-amazon-img.html
			var elmImage = IMG({
				src : 'http://z-ecx.images-amazon.com/images/P/' + 
					Extractors.Amazon.getAsin(ctx) + 
					'.09.MAIN._FMpng_SCRMZZZZZZ_.png'
			});
			elmImage.onload = function(){
				// 画像が存在しない場合1ピクセル四方の画像が返される
				if(elmImage.width < 50 && elmImage.height < 50)
					return elmImage.onerror();
				
				d.callback(elmImage.src);
			}
			
			// 画像が存在していてもエラーになることがある
			elmImage.onerror = function(){
				var url = ctx.target.src.split('.');
				url.splice(-2, 1, 'LZZZZZZZ');
				url = url.join('.').replace('.L.LZZZZZZZ.', '.L.'); // カスタマーイメージ用
				
				d.callback(url);
			}
			
			d.addCallback(function(url){
				with(ctx.target){
					src = url
					height = '';
					width = '';
					style.height = 'auto';
					style.width = 'auto';
				}
				
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : url,
				};
			});
			
			return d;
		},
	},
	
	{
		name : 'Quote - Amazon',
		ICON : 'http://www.amazon.com/favicon.ico',
		check : function(ctx){
			return Extractors.Amazon.preCheck(ctx) && ctx.selection;
		},
		extract : function(ctx){
			Extractors.Amazon.extract(ctx);
			return Extractors.Quote.extract(ctx);
		},
	},

	{
		name : 'Link - Amazon',
		ICON : 'http://www.amazon.com/favicon.ico',
		check : function(ctx){
			return Extractors.Amazon.preCheck(ctx);
		},
		extract : function(ctx){
			Extractors.Amazon.extract(ctx);
			return Extractors.Link.extract(ctx);
		},
	},
	
	{
		name : 'ReBlog',
		extractByLink : function(ctx, link){
			var self = this;
			return request(link).addCallback(function(res){
				var doc = convertToHTMLDocument(res.responseText);
				ctx.href = link;
				ctx.title = ($x('//title/text()', doc) || '').replace(/[\n\r]/g, '');
				
				return self.extractByPage(ctx, doc);
			});
		},
		
		extractByPage : function(ctx, doc){
			var m = unescapeHTML(this.getFrameUrl(doc)).match(/.+&pid=([^&]*)&rk=([^&]*)/);
			return this.extractByEndpoint(ctx, Tumblr.TUMBLR_URL+'reblog/' + m[1] + '/' + m[2]);
		},
		
		extractByEndpoint : function(ctx, endpoint){
			var self = this;
			return Tumblr.getForm(endpoint).addCallback(function(form){
				return update({
					type     : form['post[type]'],
					item     : ctx.title,
					itemUrl  : ctx.href,
					favorite : {
						name     : 'Tumblr',
						endpoint : endpoint,
						form     : form,
					},
				}, self.convertToParams(form));
			})
		},
		
		getFrameUrl : function(doc){
			var tumblr_controls = doc.querySelector('iframe#tumblr_controls[src*="pid="]');
			if (tumblr_controls) {
				return tumblr_controls.src;
			}

			var src = doc.body.textContent.extract(/(?:<|\\x3c)iframe\b[\s\S]*?src\s*=\s*(["']|\\x22)(http:\/\/(?:www|assets)\.tumblr\.com\/.*?iframe.*?pid=.*?)\1/i, 2);
			return (src || '').replace(/\\x22/g, '"').replace(/\\x26/g, '&');
		},
		
		convertToParams	: function(form){
			switch(form['post[type]']){
			case 'regular':
				return {
					type    : 'quote',
					item    : form['post[one]'],
					body    : form['post[two]'],
				}
			
			case 'photo':
				return {
					itemUrl : form.image,
					body    : form['post[two]'],
				}
			
			case 'link':
				return {
					item    : form['post[one]'],
					itemUrl : form['post[two]'],
					body    : form['post[three]'],
				};
			
			case 'quote':
				// FIXME: post[two]検討
				return {
					body    : form['post[one]'],
				};
			
			case 'video':
				// FIXME: post[one]検討
				return {
					body    : form['post[two]'],
				};
			
			case 'conversation':
				return {
					item : form['post[one]'],
					body : form['post[two]'],
				};
			}
		},
	},
	
	{
		name : 'ReBlog - Tumblr',
		ICON : 'chrome://tombfix/skin/reblog.ico',
		check : function(ctx){
			return Extractors.ReBlog.getFrameUrl(currentDocument());
		},
		extract : function(ctx){
			return Extractors.ReBlog.extractByPage(ctx, currentDocument());
		},
	},
	
	{
		name : 'ReBlog - Dashboard',
		ICON : 'chrome://tombfix/skin/reblog.ico',
		check : function(ctx){
			return (/(tumblr-beta\.com|tumblr\.com)\//).test(ctx.href) && this.getLink(ctx);
		},
		extract : function(ctx){
			// タイトルなどを取得するためextractByLinkを使う(reblogリンクを取得しextractByEndpointを使った方が速い)
			return Extractors.ReBlog.extractByLink(ctx, this.getLink(ctx));
		},
		getLink : function(ctx){
			var link = $x(
				'./ancestor-or-self::li[starts-with(normalize-space(@class), "post")]' + 
				'//a[starts-with(@id, "permalink_") and not(contains(@href, "/private/"))]', ctx.target);
			return link && link.href;
		},
	},
	
	{
		name: 'ReBlog - Tumblr Dashboard for iPhone',
		ICON: 'chrome://tombfix/skin/reblog.ico',
		check: function(ctx){
			return (/(tumblr\.com)\/iphone/).test(ctx.href) && this.getLink(ctx);
		},
		extract : function(ctx){
			return Extractors.ReBlog.extractByLink(ctx, this.getLink(ctx));
		},
		getLink : function(ctx){
			var link = $x('./ancestor-or-self::li[starts-with(normalize-space(@id), "post")]//a[contains(concat(" ",normalize-space(@class)," ")," permalink ")]', ctx.target);
			return link && link.href;
		}
	},
	
	{
		name : 'ReBlog - Mosaic',
		ICON : 'chrome://tombfix/skin/reblog.ico',
		check : function(ctx){
			return ctx.href.match(/mosaic.html/i) && ctx.target.photo;
		},
		extract : function(ctx){
			return Extractors.ReBlog.extractByLink(ctx, ctx.target.photo.url);
		},
	},
	
	{
		name : 'ReBlog - Tumblr link',
		ICON : 'chrome://tombfix/skin/reblog.ico',
		check : function(ctx){
			return ctx.link && ctx.link.href.match(/^http:\/\/[^.]+.tumblr\.com\/post\/\d+/);
		},
		extract : function(ctx){
			return Extractors.ReBlog.extractByLink(ctx, ctx.link.href);
		},
	},
	
	{
		name : 'Photo - Ameba blog',
		ICON : 'http://ameblo.jp/favicon.ico',
		check : function(ctx){
			return ctx.onLink && 
				ctx.host == ('ameblo.jp') &&
				ctx.onImage &&
				ctx.target.src.match(/\/t[0-9]+_/);
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : ctx.target.src.replace(/(\/t[0-9]+_)/, '/o'),
			};
		},
	},
	
	{
		name : 'Photo - Flickr',
		ICON : Models.Flickr.ICON,
		
		RE : new RegExp('^http://(?:.+?.)?static.?flickr.com/\\d+?/(\\d+?)_.*'),
		getImageId : function(ctx){
			// 他サイトに貼られているFlickrにも対応する
			if(/flickr\.com/.test(ctx.host)){
				// ログインしているとphoto-drag-proxyが前面に表示される
				// アノテーション上の場合はphoto_notesの孫要素となる
				if(
					(ctx.target.src && ctx.target.src.match('spaceball.gif')) || 
					ctx.target.id == 'photo-container' || 
					$x('./ancestor-or-self::div[@id="photo-drag-proxy"]', ctx.target)
				){
					ctx.target = $x('//div[@class="photo-div"]/img') || ctx.target;
				} else if ($x('./ancestor-or-self::a[@data-track]', ctx.target)) {
					ctx.target = $x('./ancestor-or-self::a[@data-track]/img', ctx.target);
				}
			}
			
			if(!ctx.target || !ctx.target.src || !ctx.target.src.match(this.RE))
				return;
			
			return RegExp.$1;
		},
		check : function(ctx){
			return this.getImageId(ctx);
		},
		extract : function(ctx){
			var id = this.getImageId(ctx);
			return new DeferredHash({
				'info'  : Flickr.getInfo(id),
				'sizes' : Flickr.getSizes(id),
			}).addCallback(function(r){
				if(!r.info[0])
					throw new Error(r.info[1].message);
				
				var info = r.info[1];
				var sizes = r.sizes[1];
				
				var title = info.title._content;
				ctx.title = title + ' on Flickr'
				ctx.href  = info.urls.url[0]._content;
				
				return {
					type      : 'photo',
					item      : title,
					itemUrl   : sizes.pop().source,
					author    : info.owner.username,
					authorUrl : ctx.href.extract('^(http://.*?flickr.com/photos/.+?/)'),
					favorite  : {
						name : 'Flickr',
						id   : id,
					},
				}
			}).addErrback(function(err){
				return Extractors.Photo.extract(ctx);
			});
		},
	},
	
	{
		name : 'Photo - Google Book Search',
		ICON : Models.Google.ICON,
		check : function(ctx){
			if(!(/^books.google./).test(ctx.host))
				return;
			
			return !!this.getImage(ctx);
		},
		extract : function(ctx){
			ctx.target = this.getImage(ctx);
			
			return Extractors['Photo - Upload from Cache'].extract(ctx);
		},
		getImage : function(ctx){
			// 標準モード
			var img = $x('./ancestor::div[@class="pageImageDisplay"]//img[contains(@src, "//books.google.")]', ctx.target);
			if(img)
				return img;
			
			// HTMLモード
			var div = $x('./ancestor::div[@class="html_page_image"]', ctx.target);
			if(div){
				var img = new Image();
				img.src = getStyle(div, 'background-image').replace(/url\((.*)\)/, '$1');
				
				return img;
			}
		},
	},
	
	{
		name : 'Photo - Kiva',
		ICON : 'http://www.kiva.org/favicon.ico',
		check : function(ctx){
			return (ctx.onImage && this.isOriginalUrl(ctx.target.src)) || 
				(ctx.onLink && this.isOriginalUrl(ctx.link.href));
		},
		extract : function(ctx){
			return this.getFinalUrl(ctx.onLink? ctx.link.href : ctx.target.src).addCallback(function(url){
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : url,
				}
			});
		},
		isOriginalUrl : function(url){
			return /^http:\/\/www\.kiva\.org\/img\//.test(url);
		},
		getFinalUrl : function(original){
			var self = this;
			return getFinalUrl(original).addCallback(function(url){
				// ホスティングサイトに変わったか?
				if(!self.isOriginalUrl(url))
					return url;
				
				// s3と仮定してテストしてみる
				return getFinalUrl(original.replace('www', 's3'));
			}).addErrback(function(){
				return original;
			});
		},
	},
	
	{
		name : 'Photo - 4u',
		ICON : Models['4u'].ICON,
		check : function(ctx){
			return ctx.onImage && 
				ctx.href.match('^http://4u.straightline.jp/image/') && 
				ctx.target.src.match('/static/upload/l/l_');
		},
		extract : function(ctx){
			var author = $x('(//div[@class="entry-information"]//a)[1]');
			var iLoveHer = $x('//div[@class="entry-item fitem"]//a/@href');
			return {
				type      : 'photo',
				item      : ctx.title.extract(/(.*) - 4U/i),
				itemUrl   : ctx.target.src,
				author    : author.textContent.trim(),
				authorUrl : author.href,
				favorite  : {
					name : '4u',
					id   : iLoveHer && decodeURIComponent(iLoveHer.extract('src=([^&]*)')),
				}
			};
		},
	},

	{
		name : 'Photo - We Heart It',
		ICON : WeHeartIt.ICON,
		RE   : new RegExp(
			'^https?://' +
				'(?:data\\d+\\.whicdn\\.com/images|weheartit\\.com/entry)/\\d+'
		),

		check   : function (ctx) {
			if (!ctx.selection) {
				let doc = ctx.document;

				if (
					/^image/.test(doc.contentType) || !this.RE.test(ctx.href) ||
					doc.querySelector('meta[itemprop="url"]')
				) {
					return this.getEntryID(ctx);
				}
			}
		},
		extract : function (ctx) {
			var id = this.getEntryID(ctx),
				url = WeHeartIt.ENTRY_URL + id;

			return request(url, {
				responseType : 'document'
			}).addCallback(({response : doc}) => {
				var ps = {},
					{title} = doc,
					author = doc.querySelector('a[itemprop="provider"]');

				if (author) {
					update(ps, {
						author    : author.querySelector('.avatar').title,
						authorUrl : author.href
					});
				}

				ctx.title = title;
				ctx.href = url;

				return update(ps, {
					type      : 'photo',
					item      : title,
					itemUrl   : doc.querySelector('meta[property="og:image"]').content,
					favorite  : {
						name : 'WeHeartIt',
						id   : id
					}
				});
			});
		},
		getEntryID : function (ctx) {
			var url = ctx.onImage ? ctx.target.src : (
				ctx.onLink ? ctx.link.href : ctx.href
			);

			if (this.RE.test(url)) {
				return url.extract(/\/(\d+)/);
			}
		}
	},

	{
		name : 'Photo - Snipshot',
		ICON : Models.Snipshot.ICON,
		check : function(ctx){
			return ctx.href.match('http://services.snipshot.com/edit/');
		},
		extract : function(ctx){
			var id = ctx.window.m ? ctx.window.m.id : ctx.window.snipshot.FILE;
			var info = ctx.window.SnipshotImport;
			
			if(info){
				ctx.href  = info.url;
				ctx.title = info.title;
			} else {
				ctx.href  = '';
				ctx.title = '';
			}
			
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : 'http://services.snipshot.com/save/'+id+'/snipshot_'+id+'.jpg',
			}
		},
	},
	
	{
		name : 'Photo - Fishki.Net',
		ICON : 'http://de.fishki.net/favicon.ico',
		check : function(ctx){
			return ctx.onImage &&
				ctx.target.src.match('//fishki.net/');
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : ctx.target.src.replace('//fishki.net/', '//de.fishki.net/'),
			}
		},
	},
	
	{
		name : 'Photo - BRIGIT',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.host == 'brigit.jp' && $x('ancestor::div[@id="photo_1"]', ctx.target);
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : $x('preceding-sibling::img', ctx.target).src,
			}
		},
	},
	
	{
		name : 'Photo - Google',
		ICON : Models.Google.ICON,
		check : function(ctx){
			return (ctx.onLink && ctx.link.href.match('http://lh..(google.ca|ggpht.com)/.*(png|gif|jpe?g)$'));
		},
		extract : function(ctx){
			return request(ctx.link.href).addCallback(function(res){
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : $x('//img[1]', convertToHTMLDocument(res.responseText)).src,
				}
			});
		},
	},
	
	{
		name : 'Photo - 1101.com/ajisha',
		ICON : 'http://www.1101.com/favicon.ico',
		check : function(ctx){
			return (ctx.onLink && ctx.link.href.match('http://www.1101.com/ajisha/p_.*.html'));
		},
		extract : function(ctx){
			return {
				type      : 'photo',
				item      : ctx.title,
				itemUrl   : ctx.link.href.replace(
					new RegExp('http://www.1101.com/ajisha/p_(.+).html'), 
					'http://www.1101.com/ajisha/photo/p_$1_z.jpg'),
			}
		},
	},
	
	{
		name : 'Photo - Picasa',
		ICON : 'http://picasaweb.google.com/favicon.ico',
		check : function(ctx){
			return (/picasaweb\.google\./).test(ctx.host) && ctx.onImage;
		},
		extract : function(ctx){
			var item = $x('//span[@class="gphoto-context-current"]/text()') || $x('//div[@class="lhcl_albumtitle"]/text()') || '';
			return {
				type      : 'photo',
				item      : item.trim(),
				itemUrl   : ctx.target.src.replace(/\?.*/, ''),
				author    : $x('id("lhid_user_nickname")/text()').trim(),
				authorUrl : $x('id("lhid_portraitlink")/@href'),
			}
		},
	},
	
	{
		name : 'Photo - webshots',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.host.match('^.+\.webshots\.com') && this.getAuthor();
		},
		extract : function(ctx){
			var author = this.getAuthor();
			return {
				type      : 'photo',
				item      : $x('//div[@class="media-info"]/h1/text()'),
				itemUrl   : $x('//li[@class="fullsize first"]/a/@href'),
				author    : author.textContent.trim(),
				authorUrl : author.href,
			}
		},
		getAuthor : function(){
			return $x('(//img[@class="user-photo"])[1]/ancestor::a');
		},
	},
	
	{
		name : 'Photo - Blogger',
		ICON : 'https://www.blogger.com/favicon.ico',
		check : function(ctx){
			return ctx.onLink &&
				(''+ctx.link).match(/(png|gif|jpe?g)$/i) &&
				(''+ctx.link).match(/(blogger|blogspot)\.com\/.*\/s\d{2,}-h\//);
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : (''+ctx.link).replace(/\/(s\d{2,})-h\//, '/$1/'),
			}
		},
	},
	
	{
		name : 'Photo - Shorpy',
		ICON : 'http://www.shorpy.com/favicon.ico',
		check : function(ctx){
			return ctx.onImage &&
				ctx.target.src.match(/www.shorpy.com\/.*.preview\.jpg/i);
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : ctx.target.src.replace('\.preview\.jpg', '.jpg'),
			}
		},
	},
	
	{
		name : 'Photo - FFFFOUND!',
		ICON : Models.FFFFOUND.ICON,
		check : function(ctx){
			return (ctx.href.match('http://ffffound.com/image/') && (/^asset/).test(ctx.target.id)) ||
				(ctx.onLink && ctx.link.href.match('http://ffffound.com/image/'));
		},
		extract : function(ctx){
			if(ctx.href.match('http://ffffound.com/image/') && (/^asset/).test(ctx.target.id)){
				var d = succeed(currentDocument());
			} else {
				var d = request(ctx.link.href).addCallback(function(res){
					// 相対パスを処理するためdocumentを渡す
					var doc = convertToHTMLDocument(res.responseText, ctx.document);
					
					ctx.href = ctx.link.href;
					ctx.target = $x('(//img[starts-with(@id, "asset")])', doc);
					
					return doc;
				})
			}
			
			d.addCallback(function(doc){
				var author = $x('//div[@class="saved_by"]/a[1]', doc);
				ctx.title = $x('//title/text()', doc) || '';
				
				var uri = createURI(ctx.href);
				ctx.href = uri.prePath + uri.filePath;
				
				return {
					type      : 'photo',
					item      : $x('//div[@class="title"]/a/text()', doc).trim(),
					itemUrl   : ctx.target.src.replace(/_m(\..{3})$/, '$1'),
					author    : author.textContent,
					authorUrl : author.href,
					favorite  : {
						name : 'FFFFOUND',
						id   : ctx.href.split('/').pop(),
					},
				}
			});
			
			return d;
		},
	},
	
	{
		name : 'Photo - Google Image Search',
		ICON : Google.ICON,
		check : function (ctx) {
			if (
				/^www\.google\.(?:co\.jp|com)$/.test(ctx.hostname) &&
					ctx.pathname === '/search' &&
					queryHash(ctx.search).tbm === 'isch' &&
					!ctx.selection && ctx.onImage && ctx.onLink
			) {
				let urls = this.getURLs(ctx);

				return urls.imgurl && urls.imgrefurl;
			}
		},
		extract : function (ctx) {
			var urls = this.getURLs(ctx),
				itemUrl = decodeURIComponent(decodeURIComponent(urls.imgurl));

			ctx.href = decodeURIComponent(decodeURIComponent(urls.imgrefurl));

			return request(ctx.href, {
				responseType : 'document'
			}).addCallback(({response : doc}) => {
				ctx.title = doc.title || createURI(itemUrl).fileName;

				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : itemUrl
				};
			});
		},
		getURLs : function (ctx) {
			var {imgurl, imgrefurl} = queryHash($x('parent::a/@href', ctx.target));

			return {
				imgurl    : imgurl,
				imgrefurl : imgrefurl
			};
		}
	},
	
	{
		name : 'Photo - Frostdesign.net',
		ICON : 'http://mfrost.typepad.com/favicon.ico',
		check : function(ctx){
			return ctx.host == 'mfrost.typepad.com' && (ctx.onLink && ctx.link.href.match('http://mfrost.typepad.com/.shared/image.html'));
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : 'http://mfrost.typepad.com' + ctx.link.href.split('?').pop(),
			}
		},
	},
	
	{
		name : 'Photo - MediaWiki Thumbnail',
		ICON : 'http://www.mediawiki.org/favicon.ico',
		check : function(ctx){
			return ctx.onLink && 
				hasElementClass(ctx.document.body, 'mediawiki') && 
				/wiki\/.+:/.test(ctx.link.href) && 
				(/\.(svg|png|gif|jpe?g)$/i).test(ctx.link.href);
		},
		extract : function(ctx){
			return request(ctx.link.href).addCallback(function(res){
				// SVGの場合サムネイルを取得する
				var xpath = (/\.svg$/i).test(ctx.link.href)?
					'id("file")/a/img/@src':
					'id("file")/a/@href';
				
				return {
					type	  : 'photo',
					item	  : ctx.title,
					itemUrl : $x(xpath, convertToHTMLDocument(res.responseText))
				};
			});
		}
	},
	
	{
		name : 'Photo - ITmedia',
		ICON : 'http://www.itmedia.co.jp/favicon.ico',
		REFERRER: 'http://www.itmedia.co.jp/',
		check : function(ctx){
			return ctx.onLink && ctx.link.href.match('http://image.itmedia.co.jp/l/im/');
		},
		extract : function(ctx){
			ctx.target = {
				src : ctx.link.href.replace('/l/im/', '/'),
			};
			return downloadWithReferrer(ctx.target.src, this.REFERRER).addCallback(function(file){
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : ctx.target.src,
					file    : file
				};
			});
		}
	},
	
	{
		name : 'Photo - Cheezburger',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.onImage && /(thereifixedit\.files\.wordpress\.com|chzbgr\.com)/.test(ctx.target.src);
		},
		extract : function(ctx){
			var img = ctx.target;
			var src = capture(img, null, {
				w : img.naturalWidth,
				h : img.naturalHeight - 12,
			});
			return download(src, getTempDir(uriToFileName(ctx.href) + '.png')).addCallback(function(file){
				return {
					type : 'photo',
					item : ctx.title,
					file : file,
				}
			});
		},
	},
	
	{
		name : 'Photo - Tabelog',
		ICON : 'http://tabelog.com/favicon.ico',
		check : function(ctx){
			return /tabelog\.com/.test(ctx.host) && /link-(left|right)/.test(ctx.target.id);
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : $x('//p[@class="original-photo"]/a/@href'),
			}
		},
	},
	
	{
		name : 'Photo - pixiv',
		ICON : 'http://www.pixiv.net/favicon.ico',
		REFERRER : 'http://www.pixiv.net/',
		PAGE_URL : 'http://www.pixiv.net/member_illust.php?mode=medium&illust_id=',
		API_URL : 'http://spapi.pixiv.net/iphone/illust.php?illust_id=',
		IMG_RE : new RegExp(
			'^https?://(?:[^.]+\\.)?pixiv\\.net/' +
				'img\\d+/(?:works/\\d+x\\d+|img)/[^/]+/' +
				'(?:mobile/)?\\d+(?:_[^.]+)?\\.'
		),
		IMG_THUMB_RE : new RegExp(
			'^https?://(?:[^.]+\\.)?pixiv\\.net/' +
				'img-inf/img/\\d+/\\d+/\\d+/\\d+/\\d+/\\d+/\\d+(?:_[^.]+)?\\.'
		),
		IMG_PAGE_RE : /^https?:\/\/(?:[^.]+\.)?pixiv\.net\/member_illust\.php/,

		check : function (ctx) {
			if (!ctx.selection) {
				if (ctx.onImage || /^image/.test(ctx.document.contentType) || ctx.onLink) {
					return this.getIllustID(ctx, true);
				} else {
					return this.isImagePage(ctx) && this.getImageElement(ctx);
				}
			}
		},
		extract : function (ctx) {
			var that = this, retry = true;

			return this.getMediumPage(ctx).addCallback(function getImage(info){
				var {imageURL, pageTitle, illustID} = info;

				return downloadWithReferrer(imageURL, that.REFERRER).addCallback(file => {
					ctx.title = pageTitle;
					ctx.href = that.PAGE_URL + illustID;

					return {
						type    : 'photo',
						item    : pageTitle,
						itemUrl : imageURL,
						file    : file
					};
				}).addErrback(err => {
					// when image extension is wrong
					if (retry) {
						retry = false;
						return that.fixImageExtensionFromAPI(info).addCallback(getImage);
					}

					throw new Error(err);
				});
			});
		},
		getMediumPage : function (ctx) {
			var illustID = this.getIllustID(ctx);

			if (!ctx.onImage && !ctx.onLink && this.isImagePage(ctx, 'medium')) {
				return succeed(this.getInfo(ctx, illustID));
			}

			return request(this.PAGE_URL + illustID, {
				responseType : 'document'
			}).addCallback(res => this.getInfo(ctx, illustID, res.response));
		},
		getInfo : function (ctx, illustID, doc) {
			var {title} = doc || ctx.document,
				img = this.getImageElement(doc ? {document : doc} : ctx, illustID),
				url;

			// for limited access about mypixiv
			if (!img) {
				throw new Error(getMessage('error.contentsNotFound'));
			}

			url = this.getFullSizeImageURL(img.src);

			if (/の漫画 \[pixiv\](?: - [^ ]+)?$/.test(title)) {
				url = url.replace(
					/img\/[^\/]+\/\d+/,
					'$&_big_p' + this.getMangaPageNumber(ctx)
				);
			}

			return {
				imageURL  : url,
				pageTitle : title,
				illustID  : illustID
			};
		},
		fixImageExtensionFromAPI : function (info) {
			return request(
				this.API_URL + info.illustID + '&' + getCookieString('pixiv.net', 'PHPSESSID')
			).addCallback(res => {
				var extension = res.responseText.trim().split(',')[2].replace(/"/g, '');

				info.imageURL = info.imageURL.replace(
					/(img\/[^\/]+\/\d+(?:_big_p\d+)?\.).+$/, '$1' + extension
				);

				return info;
			});
		},
		isImagePage : function (target, mode) {
			if (target && this.IMG_PAGE_RE.test(target.href)) {
				let queries = queryHash(target.search);

				if (queries.illust_id && (mode ? queries.mode === mode : queries.mode)) {
					return true;
				}
			}

			return false;
		},
		getImageElement : function (ctx, illustID) {
			return ctx.document.querySelector([
				// mode=medium in login
				'a[href*="illust_id=' +
					(illustID || queryHash(ctx.search).illust_id) + '"] > img',
				// mode=big and mode=manga_big in login
				'body > img:only-child',
				// mode=manga
				'.image',
				// non-r18 illust in logout
				'.cool-work-main > .img-container > a.medium-image > img',
				// r18 in logout
				'.cool-work-main > .sensored > img'
			].join(', '));
		},
		getFullSizeImageURL : function (url) {
			var pageNum;

			url = url
				.replace(/works\/\d+x\d+/, 'img')
				.replace(/(img\/[^\/]+\/)mobile\/(\d+)/, '$1$2');

			pageNum = url.extract(/img\/[^\/]+\/\d+(?:_[^_]+)?_p(\d+)/);

			url = url.replace(/(img\/[^\/]+\/\d+)(?:_[^.]+)?/, '$1');

			if (pageNum) {
				url = url.replace(/img\/[^\/]+\/\d+/, '$&_big_p' + pageNum);
			}

			return url;
		},
		getIllustID : function (ctx, noCheckCtx) {
			return (() => {
				var isImageOnly = /^image/.test(ctx.document.contentType);

				if (ctx.onImage || isImageOnly || ctx.onLink) {
					let {target, link} = ctx, url;

					if (ctx.onImage && target) {
						url = target.src;
					} else if (isImageOnly) {
						url = ctx.href;
					} else {
						url = link.href;
					}

					if (this.IMG_RE.test(url)) {
						url = this.getFullSizeImageURL(url);
						return url.extract(/img\/[^\/]+\/(\d+)/);
					} else if (this.IMG_THUMB_RE.test(url)) {
						return url.extract(/\/(\d+)(?:_[^.]+)?\./);
					}

					if (this.isImagePage(link)) {
						return queryHash(link.search).illust_id;
					}
				} else if (!noCheckCtx && this.isImagePage(ctx)) {
					return queryHash(ctx.search).illust_id;
				}
			})() || '';
		},
		getMangaPageNumber : function (ctx) {
			return (() => {
				var isImageOnly = /^image/.test(ctx.document.contentType);

				if (ctx.onImage || isImageOnly || ctx.onLink) {
					let {target, link} = ctx, url;

					if (ctx.onImage && target) {
						url = target.src;
					} else if (isImageOnly) {
						url = ctx.href;
					} else {
						url = link.href;
					}

					if (this.IMG_RE.test(url)) {
						url = this.getFullSizeImageURL(url);
						return url.extract(/img\/[^\/]+\/\d+_big_p(\d+)/);
					} else if (this.isImagePage(link, 'manga_big')) {
						return queryHash(link.search).page;
					}
				} else if (this.isImagePage(ctx, 'manga_big')) {
					return queryHash(ctx.search).page;
				}
			})() || '0';
		}
	},
	
	{
		name : 'Photo - Lightbox',
		ICON : 'chrome://tombfix/skin/photo.png',
		PATTERNS : [
			{re: /(nextLink|prevLink|hoverNav)/, image: 'lightboxImage'},
			{re: /(lbPrevLink|lbNextLink|lbImage)/, image: 'lbImage'}
		],
		getPattern : function(ctx){
			var id = ctx.target.id;
			var ps = this.PATTERNS;
			for(var i=0 ; i<ps.length ; i++)
				if(ps[i].re.test(id))
					return ps[i];
		},
		check : function(ctx){
			return !!this.getPattern(ctx);
		},
		extract : function(ctx){
			var img  = $x('id("' + this.getPattern(ctx).image + '")');
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : (img instanceof Ci.nsIDOMHTMLImageElement)? 
					img.src : 
					resolveRelativePath(img.style.backgroundImage.extract(/\([" ]*([^"]+)/), ctx.href),
			}
		}
	},
	
	{
		name : 'Photo - covered',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			if(!currentDocument().elementFromPoint || !ctx.onImage)
				return;
			
			// 1px四方の画像の上でクリックされたか?
			// FIXME: naturalHeight利用
			var img = IMG({src : ctx.target.src});
			return (img.width==1 && img.height==1);
		},
		extract : function(ctx){
			removeElement(ctx.target);
			
			return Extractors[ctx.bgImageURL?
				'Photo - background image' :
				'Photo - area element'].extract(ctx);
		},
	},
	
	{
		name : 'Photo - area element',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			if(currentDocument().elementFromPoint && tagName(ctx.target)=='area')
				return true;
		},
		extract : function(ctx){
			var target = ctx.target;
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : $x('//img[@usemap="#' + target.parentNode.name + '"]', target.ownerDocument).src,
			}
		},
	},
	
	{
		name : 'Photo - image link',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			if(!ctx.onLink)
				return;
			
			var uri = createURI(ctx.link.href);
			return uri && (/(png|gif|jpe?g)$/i).test(uri.fileExtension);
		},
		extract : function(ctx){
			ctx.target = {
				src : ctx.link.href
			};
			
			return Extractors.Photo.extract(ctx);
		},
	},
	
	{
		name : 'Photo - Data URI',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.onImage && ctx.target.src.match(/^data:/);
		},
		extract : function(ctx){
			var src = ctx.target.src || ctx.target.toDataURL();
			return download(src, getTempDir(uriToFileName(ctx.href) + '.png')).addCallback(function(file){
				return {
					type : 'photo',
					item : ctx.title,
					file : file,
				}
			});
		},
	},
	
	{
		name : 'Photo - Canvas',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return tagName(ctx.target)=='canvas';
		},
		extract : function(ctx){
			return Extractors['Photo - Data URI'].extract(ctx);
		},
	},
	
	{
		name : 'Photo',
		ICON : 'chrome://tombfix/skin/photo.png',
		PROTECTED_SITES : [
			'files.posterous.com/',
			'image.itmedia.co.jp/',
			'wretch.yimg.com/',
			'pics.*.blog.yam.com/',
			'/www.imgscan.com/image_c.php',
			'keep4u.ru/imgs/',
			'/www.toofly.com/userGallery/',
			'/www.dru.pl/',
			'adugle.com/shareimagebig/',
			'gizmag.com/pictures/',
			'/awkwardfamilyphotos.com/',
			'/docs.google.com/',
			'share-image.com/pictures/big/',
			'^http://i\\d+\\.pixiv\\.net/img\\d+/'
		],
		check : function(ctx){
			return ctx.onImage;
		},
		extract : function(ctx){
			var target = ctx.target;
			var itemUrl = (tagName(target)=='object')? target.data : target.src;
			
			if(this.PROTECTED_SITES.some(function(re){
				return RegExp(re).test(itemUrl);
			})){
				return Extractors['Photo - Upload from Cache'].extract(ctx);
			};
			
			if(ctx.document.contentType.match(/^image/))
				ctx.title = ctx.href.split('/').pop();
			
			// ポスト先のサービスがリダイレクトを処理できずエラーになることがあるため必ずチェックをする(テスト中)
			return getFinalUrl(itemUrl).addCallback(function(url){
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : url,
				}
			});
		},
	},
	
	{
		name : 'Photo - Upload from Cache',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.onImage;
		},
		extract : function(ctx){
			if(ctx.document.contentType.match(/^image/))
				ctx.title = ctx.href.split('/').pop();
			
			var target = ctx.target;
			var itemUrl = (tagName(target)=='object')? target.data : target.src;
			
			return download(itemUrl, getTempDir()).addCallback(function(file){
				return {
					type    : 'photo',
					item    : ctx.title,
					itemUrl : itemUrl,
					file    : file,
				}
			});
		},
	},
	
	{
		name : 'Video - Vimeo',
		ICON : 'https://vimeo.com/favicon.ico',
		check : function (ctx) {
			return ctx.hostname === 'vimeo.com' && /^\/\d+$/.test(ctx.pathname) &&
				this.getAuthor(ctx.document);
		},
		extract : function (ctx) {
			var author = this.getAuthor(ctx.document);
			return {
				type      : 'video',
				item      : ctx.title.replace(/ on Vimeo$/, ''),
				itemUrl   : ctx.href,
				author    : author.textContent,
				authorUrl : author.href
			};
		},
		getAuthor : function (doc) {
			return doc.querySelector('.byline > a');
		}
	},
	
	{
		name : 'Video - YouTube',
		ICON : 'https://www.youtube.com/favicon.ico',

		check : function (ctx) {
			if (
				!ctx.selection && !ctx.onImage && !ctx.onLink &&
				/^https?:\/\/www\.youtube\.com\/watch\?/.test(ctx.href)
			) {
				return queryHash(ctx.search).v && this.getAuthor(ctx.document);
			}
		},
		extract : function (ctx) {
			var doc = ctx.document,
				name = doc.querySelector('meta[itemprop="name"]'),
				url = doc.querySelector('link[itemprop="url"]'),
				author = this.getAuthor(doc);

			return {
				type      : 'video',
				item      : name ? name.content : doc.title.replace(/^▶ | - YouTube$/g, ''),
				itemUrl   : (url || ctx).href,
				author    : author.textContent.trim(),
				authorUrl : author.href.split('?')[0]
			};
		},
		getAuthor : function (doc) {
			return doc.querySelector('#watch7-user-header > .yt-user-name');
		}
	},
	
	{
		name : 'Video - Google Video',
		ICON : Models.Google.ICON,
		check : function(ctx){
			return ctx.host.match('video.google.com');
		},
		extract : function(ctx){
			return {
				type    : 'video',
				item    : ctx.title,
				itemUrl : ctx.href,
				body    : $x('id("embed-video")/textarea/text()'),
			}
		},
	},
	
	{
		name : 'Video - MySpaceTV',
		ICON : 'https://x.myspacecdn.com/new/common/images/favicons/favicon.ico',
		check : function(ctx){
			return ctx.host.match(/vids\.myspace\.com/) && this.getTag();
		},
		extract : function(ctx){
			var tag = this.getTag();
			ctx.href = tag.extract(/href="(.+?)"/);
			
			return {
				type    : 'video',
				item    : tag.extract(/<a.+?>(.+?)<\/a>/),
				itemUrl : ctx.href,
				body    : tag.extract(/(<object.+object>)/),
			};
		},
		getTag : function(){
			return $x('id("tv_embedcode_embed_text")/@value');
		},
	},
	
	{
		name : 'Video - Dailymotion',
		ICON : 'http://www.dailymotion.com/favicon.ico',
		check : function(ctx){
			return ctx.host.match('dailymotion.com') && this.getTag();
		},
		extract : function(ctx){
			var tag = this.getTag();
			ctx.href = tag.extract(/href="(.+?)"/);
			
			return {
				type    : 'video',
				item    : ctx.title.extract(/Dailymotion - (.*?) - /),
				itemUrl : ctx.href,
				body    : tag.extract(/(<object.+object>)/),
			};
		},
		getTag : function(){
			return $x('id("video_player_embed_code_text")/@value');
		},
	},
	
	{
		name : 'Video - Nicovideo',
		ICON : Models.Nicovideo.ICON,

		check : function (ctx) {
			if (!ctx.selection && !ctx.onImage && !ctx.onLink) {
				return /^http:\/\/www\.nicovideo\.jp\/watch\//.test(ctx.href);
			}
		},
		extract : function (ctx) {
			var externalPlayerURL = 'http://ext.nicovideo.jp/thumb_' + ctx.pathname.slice(1) + '?thumb_mode=swf&ap=1&c=1';

			return {
				type    : 'video',
				item    : ctx.title,
				itemUrl : ctx.href,
				body    : '<embed type="application/x-shockwave-flash" width="485" height="385" src="' + externalPlayerURL + '">'
			};
		}
	},
	
	{
		name : 'Quote',
		ICON : 'chrome://tombfix/skin/quote.png',
		check : function(ctx){
			return ctx.selection;
		},
		extract : function(ctx){
			return {
				type    : 'quote',
				item    : ctx.title,
				itemUrl : ctx.href,
				body    : createFlavoredString(ctx.window.getSelection()),
			}
		},
	},
	
	{
		name  : 'Quote - textarea',
		ICON  : 'chrome://tombfix/skin/quote.png',

		check : function (ctx) {
			if (!ctx.selection) {
				let target = ctx.target;

				if (target && ('selectionStart' in target)) {
					// raise NS_ERROR_FAILURE(DOMException?) in case of input[type="submit"], and so on
					try {
						return target.selectionStart !== target.selectionEnd;
					} catch (err) { }
				}
			}
		},
		extract : function (ctx) {
			var target = ctx.target,
				text = target.value.slice(
					Math.min(target.selectionStart, target.selectionEnd),
					Math.max(target.selectionStart, target.selectionEnd)
				);

			return {
				type    : 'quote',
				item    : ctx.title,
				itemUrl : ctx.href,
				body    : createFlavoredString(document.createTextNode(text))
			};
		}
	},
	
	{
		name : 'Link - trim parameters',
		ICON : 'chrome://tombfix/skin/link.png',
		TARGET_SITES : [
			'//itunes.apple.com/',
		],
		check : function(ctx){
			return this.TARGET_SITES.some(function(re){
				return RegExp(re).test(ctx.href);
			});
		},
		extract : function(ctx){
			var uri = createURI(ctx.href);
			ctx.href = uri.prePath + uri.filePath;
			return Extractors.Link.extract(ctx);
		},
	},
	
	{
		name : 'Link - link',
		ICON : 'chrome://tombfix/skin/link.png',
		check : function(ctx){
			return ctx.onLink;
		},
		extract : function(ctx){
			// リンクテキストが無い場合はページタイトルで代替する
			var title = convertToPlainText(ctx.link) || ctx.link.title;
			if(!title || title==ctx.link.href)
				title = ctx.title;
			
			return {
				type    : 'link',
				item    : title,
				itemUrl : ctx.link.href,
			};
		},
	},
	
	{
		name : 'Link',
		ICON : 'chrome://tombfix/skin/link.png',
		check : function(ctx){
			return true;
		},
		extract : function(ctx){
			var ps;
			if(ctx.onLink){
				// リンクテキストが無い場合はページタイトルで代替する
				var title = ctx.target.textContent;
				if(!title || title==ctx.target.href)
					title = ctx.title;
				
				ps = {
					type    : 'link',
					item    : title,
					itemUrl : ctx.link.href,
				};
			} else {
				ps = {
					type    : 'link',
					item    : ctx.title,
					itemUrl : ctx.href,
				}
			}
			
			if(ctx.date)
				ps.date = ctx.date;
			
			return ps;
		},
	},
	
	{
		name : 'Photo - background image',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return ctx.bgImageURL;
		},
		extract : function(ctx){
			return {
				type    : 'photo',
				item    : ctx.title,
				itemUrl : ctx.bgImageURL,
			}
		}
	},
	
	{
		name : 'Photo - Capture',
		ICON : 'chrome://tombfix/skin/photo.png',
		check : function(ctx){
			return true;
		},
		extract : function(ctx){
			// ショートカットキーからポストするためcaptureTypeを追加
			var type = ctx.captureType || input({'Capture Type' : ['Region', 'Element', 'View', 'Page']});
			if(!type)
				return;
			
			var win = ctx.window;
			return succeed().addCallback(function(){
				switch (type){
				case 'Region':
					return selectRegion().addCallback(function(region){
						return capture(win, region.position, region.dimensions);
					});
				
				case 'Element':
					return selectElement().addCallback(function(elm){
						// getBoundingClientRectで少数が返され切り取り範囲がずれるため丸める
						return capture(win, roundPosition(getElementPosition(elm)), getElementDimensions(elm));
					});
				
				case 'View':
					return capture(win, getViewportPosition(), getViewDimensions());
				
				case 'Page':
					return capture(win, {x:0, y:0}, getPageDimensions());
				}
			}).addCallback(function(image){
				return download(image, getTempDir(uriToFileName(ctx.href) + '.png'));
			}).addCallback(function(file){
				return {
					type : 'photo',
					item : ctx.title,
					file : file,
				}
			});
		}
	},
	
	{
		name : 'Text',
		ICON : 'chrome://tombfix/skin/text.png',
		check : function(ctx){
			return true;
		},
		extract : function(ctx){
			return {
				type : 'regular',
			}
		}
	},
]);

update(Extractors, {
	REDIRECT_URLS : [
		'pheedo.jp/',
		'//feedproxy.google.com/',
		'//bit.ly/',
		'//j.mp/',
		'//is.gd/',
		'//goo.gl/',
		'//nico.ms/',
	].map(function(re){
		return RegExp(re);
	}),
	
	normalizeUrl : function(url){
		return (!url || !this.REDIRECT_URLS.some(function(re){return re.test(url)}))? 
			succeed(url) : 
			getFinalUrl(url).addErrback(function(err){
				// bit.lyの統計ページなどHEAD取得未対応ページから返されるエラーを回避する
				return url;
			});
	},
	
	extract : function(ctx, ext){
		var doc = ctx.document;
		var self = this;
		
		// ドキュメントタイトルを取得する
		var title;
		if(typeof(doc.title) == 'string'){
			title = doc.title;
		} else {
			// idがtitleの要素を回避する
			title = $x('//title/text()', doc);
		}
		
		if(!title)
			title = createURI(doc.location.href).fileBaseName;
		
		ctx.title = title.trim();
		
		// canonicalが設定されていれば使う
		var canonical = $x('//link[@rel="canonical"]/@href', doc);
		if(canonical && !new RegExp(getPref('ignoreCanonical')).test(ctx.href))
			ctx.href = resolveRelativePath(canonical, ctx.href);
		ctx.href = ctx.href.replace(/\/#!\//, '/');
		
		return withWindow(ctx.window, function(){
			return maybeDeferred(ext.extract(ctx)).addCallback(function(ps){
				ps = update({
					page    : ctx.title,
					pageUrl : ctx.href,
				}, ps);
				
				return self.normalizeUrl(ps.itemUrl).addCallback(function(url){
					ps.itemUrl = url;
					return ps;
				});
			});
		});
	},
})
