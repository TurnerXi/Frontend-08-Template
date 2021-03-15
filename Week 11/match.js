function match(selector, element) {
  if (!element) return false
  // <sp> > ~ +
  if (selector.indexOf('>') > -1) {
    return _matchChild(selector, element);
  } else if (selector.indexOf('~') > -1) {
    return _matchSiblings(selector, element);
  } else if (selector.indexOf('+') > -1) {
    return _matchNextSibling(selector, element);
  } else if (selector.indexOf(' ') > -1) {
    return _matchDescendants(selector, element);
  }

  // * div .cls #id [attr]
  let regex = /\*|([a-zA-Z][0-9a-zA-Z-_]*)|(#[a-zA-Z][0-9a-zA-Z-_]*)|(\.[a-zA-Z][0-9a-zA-Z-_]*)|(\[[a-zA-Z][0-9a-zA-Z-_]*=.*\])/g;
  let res;
  while ((res = regex.exec(selector)) !== null) {
    let simpleSelector = res[0];
    if (simpleSelector.startsWith('*')) continue;
    if (simpleSelector.startsWith('#')) {
      if ('#' + element.id !== simpleSelector) return false;
    } else if (simpleSelector.startsWith('.')) {
      if (!element.classList.contains(simpleSelector.slice(1))) return false;
    } else if (simpleSelector.startsWith('[')) {
      let [key, value] = simpleSelector.replace(/\[(.*?)\]/, '$1').split('=')
      if (element.getAttribute(key) !== value) return false;
    } else {

      if (element.tagName.toLowerCase() !== simpleSelector.toLowerCase()) return false;
    }
  }
  return true;


}

function _matchDescendants(selector, element) {
  const selectors = selector.split(' ').filter(Boolean).reverse();
  for (let i = 0; i < selectors.length; i++) {
    while (element && !match(selectors[i].trim(), element)) {
      element = element.parentElement;
      if (!element) return false;
    }
  }
  return true;
}

function _matchChild(selector, element) {
  const selectors = selector.split('>').reverse();
  for (let i = 0; i < selectors.length; i++) {
    if (!match(selectors[i].trim(), element)) return false
    element = element.parentElement;
  }
  return true;
}

function _matchSiblings(selector, element) {
  const selectors = selector.split('~').reverse();
  for (let i = 0; i < selectors.length; i++) {
    while (element && !match(selectors[i], element)) {
      element = element.previousElementSibling;
      if (!element) return false;
    }
  }
  return true;
}

function _matchNextSibling(selector, element) {
  const selectors = selector.split('+').reverse();
  for (let i = 0; i < selectors.length; i++) {
    if (!match(selectors[i].trim(), element)) return false
    element = element.previousElementSibling;
  }
  return true;
}
