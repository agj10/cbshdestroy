export const DESTRUCTION_TOOLS = [
  {id:'grab',name:'잡아 옮기기',icon:'target',description:'건물이나 잔해를 클릭한 채 끌어 옮겨요. 놓으면 중력에 따라 떨어져요.'},
  {id:'physical',name:'물리 파괴',icon:'burst',description:'폭발 충격으로 구조와 지면을 부수고 잔해를 날려요.'},
  {id:'burn',name:'연소',icon:'flame',description:'표면에 불을 붙여 태우고 지지력을 약화해요.'},
  {id:'corrosion',name:'부식',icon:'droplets',description:'부식 단계를 높여 표면부터 바스러뜨려요.'},
  {id:'melt',name:'융해',icon:'mountain',description:'고열로 부재를 붉게 달구고 녹여요.'},
  {id:'mutation',name:'변이',icon:'ufo',description:'색과 형태를 기괴하게 뒤틀고 구조를 약화해요.'},
  {id:'water',name:'수압',icon:'waves',description:'국소 물살로 조각을 밀고 젖은 부재를 부식시켜요.'},
  {id:'gravity',name:'중력 왜곡',icon:'orbit',description:'조준점 위로 구조와 잔해를 끌어올려요.'},

] as const;
export type DestructionTool = typeof DESTRUCTION_TOOLS[number]['id'] | 'excavate';
