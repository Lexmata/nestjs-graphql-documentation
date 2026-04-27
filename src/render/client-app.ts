export const CLIENT_APP_JS = String.raw`
(function () {
  'use strict';

  var KIND_GROUPS = [
    { key: 'queries',       label: 'Queries',        entityKind: 'Query' },
    { key: 'mutations',     label: 'Mutations',      entityKind: 'Mutation' },
    { key: 'subscriptions', label: 'Subscriptions',  entityKind: 'Subscription' },
    { key: 'objectTypes',   label: 'Object Types',   entityKind: 'ObjectType' },
    { key: 'inputTypes',    label: 'Input Types',    entityKind: 'InputType' },
    { key: 'interfaces',    label: 'Interfaces',     entityKind: 'Interface' },
    { key: 'unions',        label: 'Unions',         entityKind: 'Union' },
    { key: 'enums',         label: 'Enums',          entityKind: 'Enum' },
    { key: 'scalars',       label: 'Scalars',        entityKind: 'Scalar' },
    { key: 'directives',    label: 'Directives',     entityKind: 'Directive' }
  ];

  var SEGMENT_OF = {
    Query: 'queries',
    Mutation: 'mutations',
    Subscription: 'subscriptions',
    ObjectType: 'types',
    InputType: 'inputs',
    Interface: 'interfaces',
    Union: 'unions',
    Enum: 'enums',
    Scalar: 'scalars',
    Directive: 'directives'
  };

  var KIND_OF_SEGMENT = {
    queries: 'Query', mutations: 'Mutation', subscriptions: 'Subscription',
    types: 'ObjectType', inputs: 'InputType', interfaces: 'Interface',
    unions: 'Union', enums: 'Enum', scalars: 'Scalar', directives: 'Directive'
  };

  var state = { model: null, basePath: '' };

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function formatTypeRef(t) {
    if (!t) return '';
    if (t.kind === 'NON_NULL') return formatTypeRef(t.ofType) + '!';
    if (t.kind === 'LIST') return '[' + formatTypeRef(t.ofType) + ']';
    return t.name;
  }

  function currentBasePath() {
    var markerScript = document.querySelector('script[data-ngd-base]');
    if (markerScript) return markerScript.getAttribute('data-ngd-base') || '';
    return location.pathname.replace(/\/(queries|mutations|subscriptions|types|inputs|interfaces|unions|enums|scalars|directives)\/[^/]+$/, '');
  }

  // Replace element's children with parsed HTML. Every caller has already
  // run user-supplied strings through escapeHtml, so the HTML string passed
  // here is trusted: entity names, descriptions, and tag values cannot
  // inject tags or attributes.
  function replaceChildrenWithHtml(el, html) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var frag = document.createRange().createContextualFragment(html);
    el.appendChild(frag);
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function init() {
    state.basePath = currentBasePath();
    fetch(state.basePath + '/schema.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (model) {
        state.model = model;
        renderNav();
        wireNavClicks();
        var initial = window.__INITIAL_ENTITY__ || null;
        renderEntity(initial);
        wireSearch();
        wirePopstate();
      })
      .catch(function (err) {
        showBanner('Failed to load schema: ' + err.message + '. Check ' + state.basePath + '/schema.json');
      });
  }

  function showBanner(text) {
    var main = document.querySelector('[data-ngd-main]');
    if (!main) return;
    clearChildren(main);
    var div = document.createElement('div');
    div.className = 'ngd-banner';
    div.textContent = text;
    main.appendChild(div);
  }

  function entityPath(kind, name) {
    var segment = SEGMENT_OF[kind];
    return state.basePath + '/' + segment + '/' + encodeURIComponent(name);
  }

  function renderNav() {
    var nav = document.querySelector('[data-ngd-nav]');
    if (!nav) return;
    var html = '';
    KIND_GROUPS.forEach(function (g) {
      var entries = state.model[g.key] || [];
      if (entries.length === 0) return;
      html += '<div class="ngd-nav-group" data-group="' + g.key + '">';
      html += '<h4>' + g.label + '</h4><ul>';
      entries.forEach(function (e) {
        var href = entityPath(g.entityKind, e.name);
        html += '<li><a href="' + escapeHtml(href) + '" data-kind="' + g.entityKind + '" data-name="' + escapeHtml(e.name) + '">' + escapeHtml(e.name) + '</a></li>';
      });
      html += '</ul></div>';
    });
    replaceChildrenWithHtml(nav, html);
  }

  function wireNavClicks() {
    var nav = document.querySelector('[data-ngd-nav]');
    if (!nav) return;
    nav.addEventListener('click', function (ev) {
      var a = ev.target.closest('a[data-kind]');
      if (!a) return;
      ev.preventDefault();
      var kind = a.getAttribute('data-kind');
      var name = a.getAttribute('data-name');
      history.pushState({ kind: kind, name: name }, '', a.getAttribute('href'));
      renderEntity({ kind: kind, name: name });
    });
  }

  function findEntity(kind, name) {
    var group = KIND_GROUPS.find(function (g) { return g.entityKind === kind; });
    if (!group) return null;
    var list = state.model[group.key] || [];
    return list.find(function (e) { return e.name === name; }) || null;
  }

  function renderEntity(ref) {
    var main = document.querySelector('[data-ngd-main]');
    if (!main) return;
    highlightNav(ref);
    if (!ref) {
      replaceChildrenWithHtml(main, '<article><h2>' + escapeHtml(state.model.meta.title) + '</h2><p>Select an entity on the left.</p></article>');
      return;
    }
    var entity = findEntity(ref.kind, ref.name);
    if (!entity) {
      replaceChildrenWithHtml(main, '<article><h2>Entity not found</h2><p>' + escapeHtml(ref.kind + ' ' + ref.name) + ' is not in the schema.</p></article>');
      return;
    }
    replaceChildrenWithHtml(main, renderEntityHtml(ref.kind, entity));
  }

  function highlightNav(ref) {
    document.querySelectorAll('[data-ngd-nav] a').forEach(function (a) {
      var match = ref && a.getAttribute('data-kind') === ref.kind && a.getAttribute('data-name') === ref.name;
      a.classList.toggle('is-active', !!match);
    });
  }

  function renderEntityHtml(kind, e) {
    var title = escapeHtml(e.name);
    var badges = '';
    if (e.deprecationReason !== undefined) {
      badges += '<span class="ngd-deprecated" title="' + escapeHtml(e.deprecationReason || '') + '">Deprecated</span>';
    }
    var parts = ['<article><h2>' + title + badges + '</h2>'];
    if (e.description) parts.push('<p>' + escapeHtml(e.description) + '</p>');
    if (e.tags) {
      if (e.tags.auth) parts.push('<p><span class="ngd-tag">Auth</span>' + escapeHtml(e.tags.auth) + '</p>');
      if (e.tags.since) parts.push('<p><span class="ngd-tag">Since</span>' + escapeHtml(e.tags.since) + '</p>');
    }
    if (e.returnType) {
      parts.push('<p>Returns: <code class="ngd-type">' + escapeHtml(formatTypeRef(e.returnType)) + '</code></p>');
    }
    if (e.args && e.args.length > 0) {
      parts.push('<h3>Arguments</h3><table class="ngd-args-table"><thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody>');
      e.args.forEach(function (a) {
        parts.push('<tr><td>' + escapeHtml(a.name) + '</td><td><code class="ngd-type">' + escapeHtml(formatTypeRef(a.type)) + '</code></td><td>' + (a.defaultValue ? '<code>' + escapeHtml(a.defaultValue) + '</code>' : '') + '</td><td>' + escapeHtml(a.description) + '</td></tr>');
      });
      parts.push('</tbody></table>');
    }
    if (e.fields && e.fields.length > 0) {
      parts.push('<h3>Fields</h3><dl>');
      e.fields.forEach(function (f) {
        parts.push('<dt><strong>' + escapeHtml(f.name) + '</strong>: <code class="ngd-type">' + escapeHtml(formatTypeRef(f.returnType)) + '</code>' + (f.deprecationReason !== undefined ? '<span class="ngd-deprecated">Deprecated</span>' : '') + '</dt>');
        parts.push('<dd>' + (f.description ? escapeHtml(f.description) : '<em>No description.</em>') + '</dd>');
      });
      parts.push('</dl>');
    }
    if (e.values && e.values.length > 0) {
      parts.push('<h3>Values</h3><dl>');
      e.values.forEach(function (v) {
        parts.push('<dt><strong>' + escapeHtml(v.name) + '</strong>' + (v.deprecationReason !== undefined ? '<span class="ngd-deprecated">Deprecated</span>' : '') + '</dt>');
        parts.push('<dd>' + (v.description ? escapeHtml(v.description) : '<em>No description.</em>') + '</dd>');
      });
      parts.push('</dl>');
    }
    if (e.members && e.members.length > 0) {
      parts.push('<h3>Members</h3><ul>');
      e.members.forEach(function (m) { parts.push('<li><code class="ngd-type">' + escapeHtml(m) + '</code></li>'); });
      parts.push('</ul>');
    }
    if (e.implements && e.implements.length > 0) {
      parts.push('<p>Implements: ');
      parts.push(e.implements.map(function (i) { return '<code class="ngd-type">' + escapeHtml(i) + '</code>'; }).join(', '));
      parts.push('</p>');
    }
    if (e.locations && e.locations.length > 0) {
      parts.push('<p>Locations: ' + e.locations.map(escapeHtml).join(', ') + '</p>');
    }
    if (e.tags && e.tags.examples && e.tags.examples.length > 0) {
      parts.push('<h3>Examples</h3>');
      e.tags.examples.forEach(function (ex) {
        parts.push('<pre><code>' + escapeHtml(ex) + '</code></pre>');
      });
    }
    parts.push('</article>');
    return parts.join('');
  }

  function wireSearch() {
    var input = document.querySelector('[data-ngd-search]');
    if (!input) return;
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      document.querySelectorAll('[data-ngd-nav] li').forEach(function (li) {
        var name = (li.textContent || '').toLowerCase();
        li.classList.toggle('ngd-hidden', q !== '' && name.indexOf(q) === -1);
      });
    });
  }

  function wirePopstate() {
    window.addEventListener('popstate', function (ev) {
      var ref = ev.state && ev.state.kind ? ev.state : parsePath(location.pathname);
      renderEntity(ref);
    });
  }

  function parsePath(pathname) {
    var tail = pathname.slice(state.basePath.length);
    var m = tail.match(/^\/(queries|mutations|subscriptions|types|inputs|interfaces|unions|enums|scalars|directives)\/([^/]+)$/);
    if (!m) return null;
    return { kind: KIND_OF_SEGMENT[m[1]], name: decodeURIComponent(m[2]) };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
