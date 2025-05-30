/*jslint browser */

import {counties} from '/county-cricket-colours/counties.js';

document.addEventListener('DOMContentLoaded', function () {
   'use strict';

   const defaultLastClassLevel = 1;
   const useCountiesFromOnlyOneCountry = false;
// const useCountiesFromOnlyOneCountry = 'England';
// const useCountiesFromOnlyOneCountry = 'Wales';
// const useCountiesFromOnlyOneCountry = 'Scotland';

   const countiesInfo = counties.createInfo().filter(
      (county) => (
         typeof useCountiesFromOnlyOneCountry !== 'string'
         || county.country === useCountiesFromOnlyOneCountry
      )
   );

   const classLevels = [...new Set(
      countiesInfo.map(
         (county) => county.classLevel
      ).filter(
         (classLevel) => Number.isInteger(classLevel)
      )
   )].toSorted(
      (x, y) => x - y
   );
   const numsCounties = classLevels.map(
      (classLevel) => countiesInfo.filter(
         (county) => county.classLevel <= classLevel
      ).length
   );
   const countiesToCompareSelect = document.querySelector('#counties-to-compare');
   countiesToCompareSelect.replaceChildren(
      ...numsCounties.map(function (numCounties) {
         const newOption = document.createElement('option');
         newOption.setAttribute('value', numCounties.toString());
         newOption.textContent = numCounties.toString();
         return newOption;
      })
   );
   document.querySelector(
      '#counties-to-compare :nth-child(' + defaultLastClassLevel + ')'
   ).setAttribute('selected', 'selected');

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
//       deepCopy: (oldThing, func) => (
//          // Create a new object, deeply copied, with func applied at each level.
//          typeof func === 'function'
//          ? func
//          : (x) => x
//       )(
//          Array.isArray(oldThing)
//          // If it's an array, use map directly.
//          ? oldThing.map(
//             (x) => util.deepCopy(x, func)
//          )
//          : typeof oldThing === 'object'
//          // If it's a non-array object, we must be less direct.
//          ? Object.fromEntries(
//             Object.entries(oldThing).map(
//                (x) => [x[0], util.deepCopy(x[1], func)]
//             )
//          )
//          // Otherwise, no recursion is required.
//          : oldThing
//       )
         // For the sake of efficiency, don't actually do any deep copying (or freezing).
         deepCopy: (oldThing) => oldThing
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
            return util.deepCopy(unfrozenPreorder, Object.freeze);
         },
         createPreorder: (oldPreorder) => util.deepCopy(
            util.createUnfrozenPreorder(
               typeof oldPreorder === 'string'
               ? JSON.parse(oldPreorder)
               : oldPreorder
            ),
            Object.freeze
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
         },
         getNextElementsForComparison: function (preorder) {
            const bestAvailableElementPairs = self.getBestAvailableElementPairs(preorder);
            return bestAvailableElementPairs[Math.floor(Math.random() * bestAvailableElementPairs.length)];
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
            )].toSorted(
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
               ).toSorted(
                  (a, b) => (
                     (self.getNumElementsGreaterThan(preorder, a) + 1)
                     / (self.getNumElementsGreaterThan(preorder, a) + self.getNumElementsLessThan(preorder, a) + 2)
                  ) - (
                     (self.getNumElementsGreaterThan(preorder, b) + 1)
                     / (self.getNumElementsGreaterThan(preorder, b) + self.getNumElementsLessThan(preorder, b) + 2)
                  )
               ).toSorted(
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
            return util.deepCopy(unfrozenPreorder, Object.freeze);
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
         if (!po.isTotalPreorder(preorder)) {
            document.querySelector('#instructions').textContent = 'Which do you prefer?';
            document.querySelector('#pairwise-input').style.display = '';
            choiceDivs.forEach(function (choiceDiv, whichChoice) {
               const countyNameDiv = document.createElement('div');
               countyNameDiv.classList.add('county-name');
               countyNameDiv.textContent = (
                  countiesInfo[nextElementsForComparison[whichChoice]].classLevel + ' '
                  + countiesInfo[nextElementsForComparison[whichChoice]].countyName
               );
               choiceDiv.replaceChildren(
                  counties.createCanvas({
                     colours: countiesInfo[nextElementsForComparison[whichChoice]].colours,
                     height: 120 * 2,
                     isHorizontal: true,
                     width: 144 * 2
                  }),
                  countyNameDiv
               );
            });
         } else {
            document.querySelector('#instructions').textContent = 'Final ranking:';
            document.querySelector('#pairwise-input').style.display = 'none';
            choiceDivs.forEach(function (choiceDiv) {
               choiceDiv.replaceChildren();
            });
         }
         const newPointsTableUl = document.createElement('ul');
         newPointsTableUl.classList.add('counties-list');
         newPointsTableUl.replaceChildren(
            ...po.getOrderedElements(preorder).map(function (group) {
               const newLi = document.createElement('li');
               newLi.replaceChildren(
                  ...group.map(function (element) {
                     const county = countiesInfo[element];
                     const newDiv = document.createElement('div');
                     newDiv.classList.add('county');
                     const newCountyNameDiv = document.createElement('div');
                     newCountyNameDiv.classList.add('county-name');
                     newCountyNameDiv.textContent = (
                        county.classLevel + ' '
                        + county.countyName + ' '
                        + po.getNumElementsLessThan(preorder, element) + '-'
                        + po.getNumElementsGreaterThan(preorder, element)
                     );
                     newDiv.replaceChildren(
                        counties.createCanvas({
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
                        }),
                        newCountyNameDiv
                     );
                     return newDiv;
                  })
               );
               return newLi;
            })
         );
         document.querySelector('#output').replaceChildren(newPointsTableUl);
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

      document.querySelector('#start-over').addEventListener('click', function () {
         const numCountiesToCompare = Number(
            countiesToCompareSelect.options[
               countiesToCompareSelect.selectedIndex
            ].value
         );
         preorder = po.createPreorder(numCountiesToCompare);
         nextElementsForComparison = po.getNextElementsForComparison(preorder);
         updatePairwiseOrdering();
      });

      preorder = po.createPreorder(
         localStorage.getItem('pairwise-ordering') ?? numsCounties[classLevels.indexOf(defaultLastClassLevel)]
      );
      nextElementsForComparison = po.getNextElementsForComparison(preorder);
      updatePairwiseOrdering();
   }());
});
