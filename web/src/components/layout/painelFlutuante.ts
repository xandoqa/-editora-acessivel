/**
 * Posicionamento dos painéis que abrem a partir de um botão da barra superior.
 *
 * O problema que isto resolve
 * ---------------------------
 * `absolute right-0` ancora o painel no BOTÃO: a borda direita do painel
 * encosta na borda direita do botão, e o painel cresce para a esquerda. Isso
 * funciona para o último botão da barra — o avatar, colado na borda direita da
 * tela, tem a largura inteira à esquerda para crescer. Não funciona para um
 * botão no meio da barra.
 *
 * No celular, os seletores de tema e idioma ficam a uns 150px da esquerda.
 * Um painel de 288px crescendo para a esquerda a partir dali começa em −138px:
 * metade dele fica fora da tela, e a parte de fora não dá para tocar. Foi o que
 * aconteceu na 3.6.3. O `max-w-[calc(100vw-1.5rem)]` que já existia não
 * protegia nada, porque o painel não era largo demais — estava no lugar errado.
 *
 * A solução
 * ---------
 * Abaixo de 640px o painel deixa de ser ancorado no botão e vira uma faixa
 * presa à tela, com folga nas duas bordas: não tem como sair, qualquer que seja
 * a posição do botão. De 640px para cima volta a ser o menu ancorado de sempre,
 * que ali tem espaço de sobra.
 *
 * Nota sobre `fixed` dentro da barra superior: a barra tem `backdrop-blur`, e
 * `backdrop-filter` faz do elemento o bloco de contenção dos descendentes
 * `fixed`. Então estas coordenadas valem em relação à barra, não à janela.
 * Abaixo de 640px dá no mesmo — a barra ocupa a largura toda e fica grudada no
 * topo —, e é por isso que o recorte é nessa faixa. `ferramentas/conferir-
 * posicionamento.py` mede os dois casos, com e sem `backdrop-filter`.
 *
 * Quem NÃO usa isto, de propósito: o menu do avatar e o painel da leitura em
 * voz. O avatar é o último botão da barra, então `right-0` já o mantém dentro
 * da tela; o painel de voz só existe de 640px para cima. Trocar o
 * posicionamento dos dois seria mexer no que não está quebrado.
 */
export const PAINEL_FLUTUANTE =
  'fixed inset-x-3 top-[76px] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12';
