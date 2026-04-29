export const homeState = {
  user: null,
  sound: true,
  filter: 'all',
  query: '',
  slide: 0,
  socialTab: 'global'
};

export function setUser(user) {
  homeState.user = user;
}

export function setFilter(filter) {
  homeState.filter = filter;
}

export function setQuery(query) {
  homeState.query = query;
}

export function setSlide(index) {
  homeState.slide = index;
}

export function setSocialTab(tab) {
  homeState.socialTab = tab;
}
