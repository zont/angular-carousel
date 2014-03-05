(function() {
	'use strict';

	angular.module('carousel', [])
	.directive('carousel', function(){
		return {
			restrict: 'E',
			replace: true,
			transclude: true,
			scope: {
				direction: '@',
				fixed: '@',
				focusedItem: '=model',
				loop: '@',
				name: '@'
			},
			controller: ['$scope', '$element', '$timeout', function($scope, $element, $timeout) {
				$scope.holderStyle = {position: 'relative'};

				var elements = [];
				var items = [];
				var deleteQueue = [];
				var focused = 0;
				var first = 0;
				var visibleCount = 1;
				var delta = 0;
				var deltaName = 'left';
				var propName = 'width';
				var holder = $element.children(0);
				var fixedTimer;

				holder.on('webkitAnimationEnd', cleanQueue);
				holder.on('webkitTransitionEnd', cleanQueue);

				function cleanQueue(withoutDigest) {
					while (deleteQueue.length > 0)
						deleteQueue.pop().remove();

					holder.removeClass('carouselItemsHolder');
					$scope.holderStyle[deltaName] = first * delta + 'px';

					if (withoutDigest !== true) {
						$scope.$digest();
						$timeout(function() {
							holder.addClass('carouselItemsHolder');
						}, 0);
					}
					else
						holder.addClass('carouselItemsHolder');
				}

				function append() {
					var oldElement = elements.shift();
					var newElement = oldElement.clone();

					holder.append(newElement);

					elements.push(newElement);
					items.push(items.shift());

					deleteQueue.push(oldElement);
				}

				function prepend() {
					var oldElement = elements.pop();
					var newElement = oldElement.clone();

					holder.prepend(newElement);

					elements.unshift(newElement);
					items.unshift(items.pop());

					deleteQueue.push(oldElement);
				}

				function calculateVisibleCount(element) {
					var style = window.getComputedStyle(element[0], null);
					var marginBefore = 'margin-left';
					var marginAfter = 'margin-right';

					if ($scope.direction == 'vertical') {
						deltaName = 'top';
						propName = 'height';
						marginBefore = 'margin-top';
						marginAfter = 'margin-bottom';
					}

					delta = element[0].getBoundingClientRect()[propName] +
						parseInt(style.getPropertyValue(marginBefore)) +
						parseInt(style.getPropertyValue(marginAfter));

					visibleCount = Math.ceil($element[0].getBoundingClientRect()[propName] / delta);

					if ($scope.fixed && $scope.fixed === 'true')
						focused = Math.floor(visibleCount / 2);

					calculateVisibleCount = angular.noop;
				}

				function setFocus(index) {
					if (elements[focused])
						elements[focused].removeClass('focused');

					var move;
					cleanQueue(true);

					if ($scope.fixed && $scope.fixed === 'true') {
						if (typeof index !== 'undefined')
							first = index > focused ? 1 : -1;

						holder.removeClass('carouselItemsHolder');
						move = first < 0 ? 0 : -1;
						$scope.holderStyle[deltaName] = (first < 0 ? -1 : 0) * delta + 'px';

						while (first < -1) {
							holder.prepend(elements[elements.length - 1]);
							elements.unshift(elements.pop());
							items.unshift(items.pop());
							first++;
						}
						while (first > 1) {
							holder.append(elements[0]);
							elements.push(elements.shift());
							items.push(items.shift());
							first--;
						}

						if (first < 0)
							prepend();
						else
							append();

						first = 0;

						$timeout(function() {
							holder.addClass('carouselItemsHolder');
							$scope.holderStyle[deltaName] = move * delta + 'px';
						}, 0);
					}
					else if (elements[index]) {
						focused = index;

						if (index + first >= visibleCount - 1)
							first = visibleCount - 1 - index;
						else if (index + first < 0)
							first = -index;

						$scope.holderStyle[deltaName] = first * delta + 'px';
					}
					else if ($scope.loop && $scope.loop === 'true') {
						holder.removeClass('carouselItemsHolder');
						move = first + (index < 0 ? 0 : -1);
						$scope.holderStyle[deltaName] = (first + (index < 0 ? -1 : 0)) * delta + 'px';

						if (index < 0)
							prepend();
						else
							append();

						$timeout(function() {
							holder.addClass('carouselItemsHolder');
							$scope.holderStyle[deltaName] = move * delta + 'px';
						}, 0);
					}

					if (elements[focused])
						elements[focused].addClass('focused');
					$scope.focusedItem = items[focused];
				}

				this.addItem = function(item, element) {
					calculateVisibleCount(element);

					elements.push(element);
					items.push(item);

					if ($scope.fixed && $scope.fixed === 'true') {
						if ($scope.focusedItem === item)
							first = items.length - 1 - focused;

						$timeout.cancel(fixedTimer);
						fixedTimer = $timeout(setFocus, 50);
					}
					else if ($scope.focusedItem === item)
						setFocus(items.length - 1);

					holder.css(propName, (elements.length + 2) * delta + 'px');
				};

				$scope.$on('carouselClean', function(event, name) {
					if ($scope.name == name) {
						elements = [];
						items = [];
					}
				});
				$scope.$on('carouselPrev', function(event, name) {
					if ($scope.name == name)
						setFocus(focused - 1);
				});
				$scope.$on('carouselNext', function(event, name) {
					if ($scope.name == name)
						setFocus(focused + 1);
				});
			}],
			template: '<div class="carousel"><div ng-style="holderStyle" class="carouselItemsHolder" ng-transclude></div></div>'
		};
	})
	.directive('carouselItem', function(){
		return {
			replace: false,
			require: '^carousel',
			restrict: 'A',
			scope: {
				item: '=model'
			},
			link: function(scope, element, attrs, carouselHolder) {
				carouselHolder.addItem(scope.item, element);
			}
		};
	});
})();