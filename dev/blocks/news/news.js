$(function() {
	var $topStatus = $('#news__top-status'),	
		$newsList = $('#news__list'),

		$item = $('#news__skeleton'),
		$curItem = $item.clone(true, true),
		info,
		date = new Date(),

		isAdmin = typeof admin !== "undefined" && admin,
		oldTitle = document.title;

	if ($('#news__list').length) {
		if (isMobile) {
			$('.news').addClass('news_mobile');
		}

		if ($('.news_deleted').length) {
			loadDeleted();
		} else {
			load();

			$(document).on('news-loaded', function() {
				updateCurrent();
			})
		}
	}

	function JSON2DOM(json) {
		for (var i = 0; i < json.length; i++) {
			date.setTime(Date.parse(json[i].ts));

			if (json[i].author) {
				info = json[i].author 
					   + ' (' + extractDomain(json[i].link) + ')'
					   + ', '
					   + formatDate(date);
			} else {
				info = extractDomain(json[i].link)
					   + ', '
					   + formatDate(date)
			}

			$curItem.find('.news__title')
					.attr('href', json[i].link)
					.text(json[i].title)
					.end()
					
					.find('.news__info').html(info)
					.end()
					
					.find('.news__desc').html(json[i].snippet);

			if (json[i].pic) {
				$curItem.find('.news__image-hidden')
						.attr('src', json[i].pic)
						.load(function() {
							$(this).siblings('.news__image')
								   .css('background-image', 'url(' + $(this).attr('src') + ')')
								   .end()
								   .remove();
						});
			}

			if (json[i].active) {
				$('.news__item').removeClass('news__item_current')
							    .attr('id', '');
				$curItem.addClass('news__item_current')
						.attr('id', 'current');
				setTimeout(function() {
					// wait for paste element
					$(document).trigger('current-updated');
				}, 300);
			}

			if (json[i].content) {
				$curItem.find('.news__full').html(json[i].content)
						.end()

						.find('.news__light').click(function(event) {
							event.preventDefault();
							toggleArticle($(this));
						})
						.show()
						.end()

						.find('.news__comments-counter')
						.attr('href', '/post/' + json[i].slug + '#disqus_thread');
			}

			$curItem.appendTo($newsList)
					.show()
					.attr('data-id', json[i].id);

			if (isAdmin) {
				$curItem.attr('draggable', true)
						.data('geek', json[i].geek)
						.data('pos', json[i].position);

				if (json[i].geek) {
					$curItem.find('.news__button_togeek')
							.removeClass('news__button_togeek')
							.addClass('news__button_ingeek')
							.end()

							.addClass('news__item_geek');
				}
			}

			$curItem = $item.clone(true, true);
		};

		$(document).trigger('news-loaded');
	}

	function load() {
		$.ajax({
			url: APIPath + '/news',
			type: 'GET',
			dataType: 'json',
			cache: false,
			async: true,
			beforeSend: function() {
				$topStatus.text('Загружаю..')
						  .show();
			}
		})
		.done(function(json) {
			$(document).on('news-loaded', function() {
				$topStatus.hide();

				$('<script/>', {
					id: 'dsq-count-scr',
					src: '//' + disqusID + '.disqus.com/count.js',
					async: true
				}).appendTo('body');

				if (isAdmin) {
					if (! isMobile) {
						$('#news__list')
							.sortable({
								items: '.news__item'
							})
							.bind('sortupdate', function(e, $ui) {
								moveArticle($ui.item);
							});
					}

					$('.news__button_current').click(function(event) {
						event.preventDefault();

						var $item = $(this).closest('.news__item');

						$.ajax({
							url: APIPath + '/news/active/' + $item.data('id'),
							type: 'PUT',
							headers: authHeaders,
							async: false
						})
						.done(function() {
							$item.addClass('news__item_current')
								 .siblings('.news__item')
								 .removeClass('news__item_current');
						})
						.fail(function(response) {
							console.log("error while activating news");
							console.log(response);
						});
					});

					$('.news__button_first').click(function(event) {
						event.preventDefault();

						var $item = $(this).closest('.news__item');

						$item.prependTo('#news__list');
						moveArticle($item);
					});

					$('.news__button_up').click(function(event) {
						event.preventDefault();

						var $item = $(this).closest('.news__item');

						$item.prev().before($item);
						moveArticle($item);
					});

					$('.news__button_down').click(function(event) {
						event.preventDefault();

						var $item = $(this).closest('.news__item');

						$item.next().after($item);
						moveArticle($item);
					});

					$('.news__button_togeek').click(function(event) {
						event.preventDefault();

						togeekArticle($(this));
					});

					$('.news__button_ingeek').click(function(event) {
						event.preventDefault();

						nogeekArticle($(this));
					});

					$('.news__button_del').click(function(event) {
						event.preventDefault();

						delArticle($(this));
					});
				}
			});

			JSON2DOM(json);
		})
		.fail(function(response) {
			$topStatus.text('Ошибка при загрузке, попробуйте обновить страницу')
					  .slideDown();
			console.log(response);
		});
	}

	function loadDeleted() {
		$.ajax({
			url: APIPath + '/news/del',
			type: 'GET',
			dataType: 'json',
			cache: false,
			async: true,
			beforeSend: function() {
				$topStatus.text('Загружаю..')
						  .show();
			}
		})
		.done(function(json) {
			$(document).on('news-loaded', function() {
				$topStatus.hide();

				if (isAdmin) {
					$('.news__button_restore')
						.css('display', 'inline-block')
						.click(function(event) {
								event.preventDefault();

								restoreArticle($(this));
						});
				}
			});

			JSON2DOM(json);
		})
		.fail(function(response) {
			$topStatus.text('Ошибка при загрузке, попробуйте обновить страницу')
					  .slideDown();
			console.log(response);
		});
	}

	function updateCurrent() {
		var timeout = 295;

		$.ajax({
			url: APIPath + '/news/active/wait/' + timeout,
			type: 'GET',
			dataType: 'json',
			async: true
		})
		.done(function(json) {
			var $current = $('.news__item[data-id=' + json.id + ']');

			if ($current.length) {
				if (!$current.hasClass('news__item_current')) {
					$('.news__item_current').removeClass('news__item_current');
					$current.addClass('news__item_current');

					document.title = "** Тема обновилась **";
					notify('Тема обновилась. Нажмите, чтобы перейти к ней.', function() {
						$('html, body').animate({
							scrollTop: $('.news__item_current').offset().top
						}, 700);

						document.title = oldTitle;
					});
				}
				
				updateCurrent();
			} else {
				document.title = "** Ошибка **";
				notify('Текущей темы нет в этом списке. Вероятно, он устарел. Нажмите, чтобы его обновить.', function() {
					$('#news__list').html('');
					load();

					$(document).one('current-updated', function() {
						$('html, body').animate({
							scrollTop: $('.news__item_current').offset().top
						}, 700);
					});

					document.title = oldTitle;
				});
			}
		})
		.fail(function(response) {
			updateCurrent();
		});
	}
});

function extractDomain(url) {
    var domain;
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    return domain.split(':')[0];
}

function toggleArticle($link) {
	var $full = $link.siblings('.news__full'),
		body = $('body')[0],
		v = 0;

	if ($full.is(':visible')) {
		$full.stop().slideUp();
	} else {
		if (! isMobile) {
			var $visibleNews = $('.news__full:visible'),
				$visibleLink = $visibleNews.siblings('.news__light');

			if ($visibleNews.length) {
				if ($full.offset().top > $visibleNews.offset().top) {
					$visibleNews.stop().slideUp({
						step: function(now, tween) {
				            if(tween.prop == "height"){
				                if (v == 0){
				                    v = now;
				                } else {
				                    var k = v - now;
				                    body.scrollTop -= k;
				                    v = now;
				                }
				            }
				        }
				    });
				} else {
					$visibleNews.stop().slideUp();
				}

				toggleArticleLink($visibleLink);
			}
		}
		
		$full.stop().slideDown();
	}
	
	toggleArticleLink($link);
}

function toggleArticleLink($link) {
	$link.text(function(i, text) {
		return text == 'Подробнее' ? 'Скрыть' : 'Подробнее';
	});
}

function moveArticle($item) {
	var $items = $('#news__list .news__item'),
		length = $items.length,
		pos = $item.data('pos'),
		index = $item.index(),
		offset = length - pos - index - 1;

	$.ajax({
		url: APIPath + '/news/move/' + pos + '/' + offset,
		type: 'PUT',
		headers: authHeaders
	})
	.fail(function(response) {
		console.log("error while moving news");
		console.log(response);
	});

	for (var i = $items.length - 1; i >= 0; i--) {
		$items.eq(i).data('pos', $items.length - $items.eq(i).index() - 1)
	};
}

function togeekArticle($el) {
	var $item = $el.closest('.news__item');

	$.ajax({
		url: APIPath + '/news/geek/' + $item.data('id'),
		type: 'PUT',
		headers: authHeaders
	})
	.done(function() {
		$item.data('geek', true)
			 .addClass('news__item_geek');
		$el.removeClass('news__button_togeek')
		   .addClass('news__button_ingeek')
		   .off()
		   .click(function(event) {
		   		event.preventDefault();

		   		nogeekArticle($(this));
		   });
	})
	.fail(function(response) {
		console.log("error while geeking news");
		console.log(response);
	});
}

function nogeekArticle($el) {
	var $item = $el.closest('.news__item');

	$.ajax({
		url: APIPath + '/news/nogeek/' + $item.data('id'),
		type: 'PUT',
		headers: authHeaders
	})
	.done(function() {
		$item.data('geek', false)
			 .removeClass('news__item_geek');
		$el.removeClass('news__button_ingeek')
		   .addClass('news__button_togeek')
		   .off()
		   .click(function(event) {
		   		event.preventDefault();

		   		togeekArticle($(this));
		   });
	})
	.fail(function(response) {
		console.log("error while nogeeking news");
		console.log(response);
	});
}

function restoreArticle($el) {
	var $item = $el.closest('.news__item');

	$.ajax({
		url: APIPath + '/news/undelete/' + $item.data('id'),
		type: 'PUT',
		headers: authHeaders
	})
	.done(function() {
		$item.remove();
	})
	.fail(function(response) {
		console.log("error while deleting news");
		console.log(response);
	});
}

function delArticle($el) {
	var $item = $el.closest('.news__item');

	$.ajax({
		url: APIPath + '/news/' + $item.data('id'),
		type: 'DELETE',
		headers: authHeaders
	})
	.done(function() {
		$item.remove();
	})
	.fail(function(response) {
		console.log("error while deleting news");
		console.log(response);
	});
}