/*
 * Widgets de acessibilidade do site e do painel: UserWay (contraste, tamanho de
 * texto etc.) e VLibras (tradutor para Libras do governo federal).
 *
 * Fica num arquivo só para a landing (index.html) e o painel (dashboard.html)
 * usarem as mesmas posições, sempre na lateral direita:
 *   - VLibras: direita, no meio da altura da tela;
 *   - UserWay: canto inferior direito.
 */
(function () {
  // Posições do UserWay: 1 topo dir., 2 meio dir., 3 inf. dir., 4 inf. centro,
  // 5 inf. esq., 6 meio esq., 7 topo esq., 8 topo centro.
  window._userway_config = window._userway_config || {};
  window._userway_config.position = "3";

  var userway = document.createElement("script");
  userway.src = "https://cdn.userway.org/widget.js";
  userway.setAttribute("data-account", "7Fm7ude4yj");
  userway.defer = true;
  document.head.appendChild(userway);

  // O plugin do VLibras cria o próprio botão. "R" = direita, meio da altura.
  var vlibras = document.createElement("script");
  vlibras.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
  vlibras.onload = function () {
    new window.VLibras.Widget({
      rootPath: "https://vlibras.gov.br/app",
      position: "R",
    });
  };
  document.body.appendChild(vlibras);
})();
