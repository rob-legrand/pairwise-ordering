/*jslint browser */

import {counties} from '../county-cricket-colours/counties.js';

document.addEventListener('DOMContentLoaded', function () {
   'use strict';

   const countiesInfo = counties.createInfo();
// const countiesInfo = counties.createInfo().filter(
//    (county) => county.country === 'Wales'
// );

   const po = (function () {

      const util = Object.freeze({
         addPrecedesRelationship: function (preorder, elementA, elementB) {
            if (!preorder[elementA][elementB].precedes) {
               preorder[elementA][elementB].precedes = true;
               // if x <= a and b <= y, then x <= y
               preorder.forEach(function (rowX, elementX) {
                  if (preorder[elementX][elementA].precedes) {
                     rowX.forEach(function (ignore, elementY) {
                        if (preorder[elementB][elementY].precedes) {
                           preorder[elementX][elementY].precedes = true;
                        }
                     });
                  }
               });
            }
            return preorder;
         },
         createUnfrozenPreorder: (oldPreorder) => (
            (Number.isInteger(oldPreorder) && oldPreorder >= 1)
            ? Array.from(
               {length: oldPreorder},
               (ignore, rowNum) => Array.from(
                  {length: oldPreorder},
                  (ignore, columnNum) => ({
                     precedes: rowNum === columnNum,
                     numTimesCompared: 0
                  })
               )
            )
            : Array.isArray(oldPreorder)
            ? oldPreorder.map(
               (oldRow) => oldRow.map(
                  (oldEntry) => ({
                     precedes: Boolean(oldEntry.precedes),
                     numTimesCompared: Number(oldEntry.numTimesCompared)
                  })
               )
            )
            : []
         ),
         deepCopy: (func, oldThing) => func(
            Array.isArray(oldThing)
            ? oldThing.map(
               (currentValue) => util.deepCopy(func, currentValue)
            )
            : typeof oldThing === 'object'
            ? Object.keys(oldThing).reduce(
               function (newObject, prop) {
                  newObject[prop] = util.deepCopy(func, oldThing[prop]);
                  return newObject;
               },
               {}
            )
            : oldThing
         )
      });

      const self = Object.freeze({
         addPairwiseComparison: function (preorder, element1, comparison, element2) {
            let unfrozenPreorder;
            unfrozenPreorder = util.createUnfrozenPreorder(preorder);
            if (comparison === '<=') {
               unfrozenPreorder = util.addPrecedesRelationship(unfrozenPreorder, element1, element2);
            } else if (comparison === '=') {
               unfrozenPreorder = util.addPrecedesRelationship(unfrozenPreorder, element1, element2);
               unfrozenPreorder = util.addPrecedesRelationship(unfrozenPreorder, element2, element1);
            } else if (comparison === '>=') {
               unfrozenPreorder = util.addPrecedesRelationship(unfrozenPreorder, element2, element1);
            } else if (comparison !== '?') {
               return preorder;
            }
            unfrozenPreorder[element1][element2].numTimesCompared += 1;
//          return util.deepCopy(Object.freeze, unfrozenPreorder);
            return unfrozenPreorder;
         },
//       createPreorder: (oldPreorder) => util.deepCopy(
//          Object.freeze,
//          util.createUnfrozenPreorder(
//             typeof oldPreorder === 'string'
//             ? JSON.parse(oldPreorder)
//             : oldPreorder
//          )
//       ),
         createPreorder: (oldPreorder) => util.createUnfrozenPreorder(
            typeof oldPreorder === 'string'
            ? JSON.parse(oldPreorder)
            : oldPreorder
         ),
         getAllElementPairs: (numElements) => Array.from(
            {length: numElements},
            (ignore, index1) => Array.from(
               {length: numElements},
               (ignore, index2) => [index1, index2]
            ).filter(
               (element) => element[0] !== element[1]
            )
         ).flat(),
         getAvailableElementPairs: (preorder) => self.getAllElementPairs(preorder.length).filter(
            (elementPair) => self.isIncomparableTo(preorder, elementPair[0], elementPair[1])
         ),
         getBestAvailableElementPairs: function (preorder) {
            const availableElementPairs = self.getAvailableElementPairs(preorder);
            const consideredElementPairs = (
               availableElementPairs.length > 0
               ? availableElementPairs
               : self.getAllElementPairs(preorder.length)
            );
            const minNumTimesCompared = Math.min(
               ...consideredElementPairs.map(
                  (elementPair) => preorder[elementPair[0]][elementPair[1]].numTimesCompared
               )
            );
            const priorityElementPairs = consideredElementPairs.filter(
               (elementPair) => preorder[elementPair[0]][elementPair[1]].numTimesCompared === minNumTimesCompared
            );
            return priorityElementPairs;
//          const minClassLevelDistance = Math.min(
//             ...priorityElementPairs.map(
//                (elementPair) => Math.abs(
//                   countiesInfo[elementPair[0]].classLevel
//                   - countiesInfo[elementPair[1]].classLevel
//                )
//             )
//          );
//          return priorityElementPairs.filter(
//             (elementPair) => Math.abs(
//                countiesInfo[elementPair[0]].classLevel
//                - countiesInfo[elementPair[1]].classLevel
//             ) === minClassLevelDistance
//          );
         },
         getNextElementsForComparison: function (preorder) {
            const bestAvailableElementPairs = self.getBestAvailableElementPairs(preorder);
            return bestAvailableElementPairs[Math.floor(Math.random() * bestAvailableElementPairs.length)];
//          return bestAvailableElementPairs[0];
         },
         getNumElementsGreaterThan: (preorder, element) => (
            preorder.filter(
               (ignore, index) => self.isGreaterThan(preorder, index, element)
            ).length
         ),
         getNumElementsLessThan: (preorder, element) => (
            preorder.filter(
               (ignore, index) => self.isLessThan(preorder, index, element)
            ).length
         ),
         getOrderedElements: function (preorder) {
            const totalOrder = self.getTotalOrder(preorder);
            const numsElementsGreaterThan = [...new Set(
               preorder.map(
                  (ignore, element) => (
                     self.getNumElementsGreaterThan(totalOrder, element)
                     - self.getNumElementsLessThan(totalOrder, element)
                  )
               )
            )].sort(
               (a, b) => a - b
            );
            return numsElementsGreaterThan.map(
               (score) => preorder.map(
                  (ignore, element) => element
               ).filter(
                  (element) => (
                     self.getNumElementsGreaterThan(totalOrder, element)
                     - self.getNumElementsLessThan(totalOrder, element)
                  ) === score
               ).sort(
                  (a, b) => (
                     (self.getNumElementsGreaterThan(preorder, a) + 1)
                     / (self.getNumElementsGreaterThan(preorder, a) + self.getNumElementsLessThan(preorder, a) + 2)
                  ) - (
                     (self.getNumElementsGreaterThan(preorder, b) + 1)
                     / (self.getNumElementsGreaterThan(preorder, b) + self.getNumElementsLessThan(preorder, b) + 2)
                  )
               ).sort(
                  (a, b) => (
                     self.getNumElementsGreaterThan(preorder, a)
                     - self.getNumElementsLessThan(preorder, a)
                  ) - (
                     self.getNumElementsGreaterThan(preorder, b)
                     - self.getNumElementsLessThan(preorder, b)
                  )
               )
            );
         },
         getTotalOrder: function (preorder) {
            let unfrozenPreorder;
            unfrozenPreorder = util.createUnfrozenPreorder(preorder);
            unfrozenPreorder.forEach(function (rowX, elementX) {
               rowX.forEach(function (ignore, elementY) {
                  if (self.isIncomparableTo(preorder, elementX, elementY)) {
                     unfrozenPreorder = self.addPairwiseComparison(unfrozenPreorder, elementX, '=', elementY);
                  }
               });
            });
//          return util.deepCopy(Object.freeze, unfrozenPreorder);
            return unfrozenPreorder;
         },
         isEquivalentTo: (preorder, element1, element2) => (
            preorder[element1][element2].precedes
            && preorder[element2][element1].precedes
         ),
         isGreaterThan: (preorder, element1, element2) => self.isLessThan(preorder, element2, element1),
         isIncomparableTo: (preorder, element1, element2) => (
            !preorder[element1][element2].precedes
            && !preorder[element2][element1].precedes
         ),
         isLessThan: (preorder, element1, element2) => (
            preorder[element1][element2].precedes
            && !preorder[element2][element1].precedes
         ),
         isTotalPreorder: (preorder) => preorder.every(
            (rowX, elementX) => rowX.every(
               (ignore, elementY) => !self.isIncomparableTo(preorder, elementX, elementY)
            )
         )
      });

      return self;
   }());

   (function () {
      let nextElementsForComparison;
      let preorder;

      const choiceDivs = document.querySelectorAll('.pairwise-choice');

      const updatePairwiseOrdering = function () {
         localStorage.setItem('pairwise-ordering', JSON.stringify(preorder));
         const outputDiv = document.querySelector('#output');
         choiceDivs.forEach(function (choiceDiv) {
            [...choiceDiv.childNodes].forEach(function (childNode) {
               childNode.remove();
            });
         });
         [...outputDiv.childNodes].forEach(function (childNode) {
            childNode.remove();
         });
         if (!po.isTotalPreorder(preorder)) {
            document.querySelector('#instructions').textContent = 'Which do you prefer?';
            document.querySelector('#pairwise-input').style.display = '';
            choiceDivs.forEach(function (choiceDiv, whichChoice) {
               choiceDiv.append(counties.createCanvas({
                  colours: countiesInfo[nextElementsForComparison[whichChoice]].colours,
                  height: 120 * 2,
                  isHorizontal: true,
                  width: 144 * 2
               }));
               const countyNameDiv = document.createElement('div');
               countyNameDiv.classList.add('county-name');
               countyNameDiv.textContent = countiesInfo[nextElementsForComparison[whichChoice]].countyName;
               choiceDiv.append(countyNameDiv);
            });
         } else {
            document.querySelector('#instructions').textContent = 'Final ranking:';
            document.querySelector('#pairwise-input').style.display = 'none';
         }
         const newPointsTableUl = document.createElement('ul');
         newPointsTableUl.classList.add('counties-list');
         po.getOrderedElements(preorder).forEach(function (group) {
            const newLi = document.createElement('li');
            group.map(
               (element) => countiesInfo[element]
            ).forEach(function (county) {
               const newDiv = document.createElement('div');
               newDiv.classList.add('county');
               newDiv.append(counties.createCanvas({
                  colours: county.colours,
                  height: (
                     po.isTotalPreorder(preorder)
                     ? 40
                     : 20
                  ),
                  isHorizontal: true,
                  width: (
                     po.isTotalPreorder(preorder)
                     ? 40
                     : 20
                  )
               }));
               const newCountyNameDiv = document.createElement('div');
               newCountyNameDiv.classList.add('county-name');
               newCountyNameDiv.textContent = (
                  county.countyName + ' '
                  + po.getNumElementsLessThan(preorder, countiesInfo.indexOf(county)) + '-'
                  + po.getNumElementsGreaterThan(preorder, countiesInfo.indexOf(county))
               ),
               newDiv.append(newCountyNameDiv);
               newLi.append(newDiv);
            });
            newPointsTableUl.append(newLi);
         });
         outputDiv.append(newPointsTableUl);
      };

      choiceDivs.forEach(function (choiceDiv, whichChoice) {
         choiceDiv.addEventListener('click', function () {
            preorder = po.addPairwiseComparison(
               preorder,
               nextElementsForComparison[0],
               (
                  whichChoice === 0
                  ? '>='
                  : '<='
               ),
               nextElementsForComparison[1]
            );
            nextElementsForComparison = po.getNextElementsForComparison(preorder);
            updatePairwiseOrdering();
         });
      });

      document.querySelector('#exactly-equal').addEventListener('click', function () {
         preorder = po.addPairwiseComparison(
            preorder,
            nextElementsForComparison[0],
            '=',
            nextElementsForComparison[1]
         );
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      document.querySelector('#defer-choice').addEventListener('click', function () {
         preorder = po.addPairwiseComparison(
            preorder,
            nextElementsForComparison[0],
            '?',
            nextElementsForComparison[1]
         );
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      document.querySelector('#start-over-8').addEventListener('click', function () {
         preorder = po.createPreorder(8);
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      document.querySelector('#start-over-16').addEventListener('click', function () {
         preorder = po.createPreorder(16);
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      document.querySelector('#start-over-24').addEventListener('click', function () {
         preorder = po.createPreorder(24);
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      document.querySelector('#start-over-all').addEventListener('click', function () {
         preorder = po.createPreorder(countiesInfo.length);
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      preorder = po.createPreorder(localStorage.getItem('pairwise-ordering') ?? countiesInfo.length);
      nextElementsForComparison = po.getNextElementsForComparison(preorder);
      updatePairwiseOrdering();
   }());
});
