/* V13 — each pitcher's one-liners, in her own voice (user 2026-09-26: "캐릭터성에 맞게 매력적이고 고혹적이게").
   Voices follow the character sheets in assets/pitcher-mobs-v1/PROMPTS.md. Teasing, confident, flirty
   banter between athletes; never explicit.
   Moments: entry (first pitch of a fight), chase (swung at a ball), whiff, strikeout, looking (called
   strike), walk, foul, out, hit, extra (2B/3B), homer, knockout (her HP hits 0). */

export const PITCHER_VOICE={
  // 레드 러시 — 27, scarlet high ponytail, gold eyes, power pitcher. Fiery, direct, loves a fight.
  'regular-01-red-rush':{
    entry:['첫 타석부터 불 붙여볼까?','내 공, 눈으로 따라올 수 있으면 해봐.'],
    chase:['어머, 그렇게 급했어?','불 보고 달려드는 나방 같네.'],
    whiff:['바람 소리만 요란하네.','더 세게. 날 설레게 해봐.'],
    strikeout:['뜨거웠지? 다음엔 데이지 마.','세 번이나 날 놓쳤어.'],
    looking:['쳐다만 볼 거야?','보는 건 공짜 아닌데.'],
    walk:['...오늘은 봐줄게.','흥, 걸어가. 대신 기억해 둬.'],
    foul:['아깝다, 그치?','조금만 더 가까이 와 봐.'],
    out:['잡혔네. 내 손바닥 안이야.'],
    hit:['제법인데?','좋아, 이제 좀 뜨거워지네.'],
    extra:['...방금 건 인정.','내 불꽃을 되받아쳤어?'],
    homer:['하, 너... 마음에 들어.','그 한 방, 잊지 않을게.'],
    knockout:['오늘은 네가 이겼어. 다음엔 내가 불태워줄게.','...식어버렸네. 다음에 또 붙자.'],
  },
  // 청록 미라주 — 26, teal lob, coral eyes, outside-corner artist. Dreamy, elusive, softly mocking.
  'regular-02-teal-mirage':{
    entry:['내가 보이는 곳에 있을 거라 믿어?','신기루를 쫓아와 볼래?'],
    chase:['잡힐 것 같았지? 그게 나야.','손 뻗으면 사라지는 거, 알면서.'],
    whiff:['어머, 허공을 안았네.','거기엔 아무것도 없었어.'],
    strikeout:['끝까지 날 잡지 못했네. 안녕.','꿈은 깨라고 있는 거야.'],
    looking:['보고만 있어도 좋아?','눈 감으면 더 잘 보일지도.'],
    walk:['...오늘은 흐릿했나 봐.'],
    foul:['닿을 듯 말 듯, 그치?'],
    out:['잡은 줄 알았지? 아쉽다.'],
    hit:['어, 날 붙잡았네.','가끔은 신기루도 걸려.'],
    extra:['제대로 봤구나. 조금 놀랐어.'],
    homer:['...진짜 날 찾아냈어.'],
    knockout:['신기루는 사라져도, 또 나타나. 기다려.','이번엔 네 눈이 맞았어.'],
  },
  // 앰버 싱커 — 28, espresso fishtail braid, honey eyes, sinkerballer. Warm, unhurried, big-sister teasing.
  'regular-03-amber-sinker':{
    entry:['천천히 해. 누나는 급하지 않아.','낮게 깔리는 공, 좋아해?'],
    chase:['아이고, 너무 서둘렀다.','땅바닥까지 따라올 줄은 몰랐네.'],
    whiff:['그렇게 위를 보면 안 되지.','꿀처럼 흘러내렸지?'],
    strikeout:['수고했어. 쉬었다 와.','가라앉는 건 공이 아니라 너였네.'],
    looking:['잘 참았어... 근데 스트라이크야.','보기만 해도 달지?'],
    walk:['오늘은 누나가 져줄게.'],
    foul:['아깝다~ 조금만 더 낮게.'],
    out:['땅볼. 누나 공은 늘 이렇게 끝나.'],
    hit:['어머, 잘 떠냈네.','제법 컸구나.'],
    extra:['그걸 퍼 올려? 칭찬해 줄게.'],
    homer:['...반했잖아.'],
    knockout:['오늘은 여기까지. 다음엔 더 달콤하게 가라앉혀 줄게.'],
  },
  // 아이보리 에이스 — 30, ash-champagne wave, deep blue eyes, poised veteran ace. Formal, cool, elegant.
  'regular-04-ivory-ace':{
    entry:['예의를 갖춰 상대해 드리죠.','실망시키지 마세요.'],
    chase:['그 공에 손을 대다니, 품위가 없네요.','유혹에 약하시군요.'],
    whiff:['조급함은 실력을 가립니다.','우아하지 않군요.'],
    strikeout:['수고하셨습니다. 다음 분.','기대했는데요.'],
    looking:['판단은 빨라야 해요.','제 공이 너무 아름다웠나요?'],
    walk:['...실례했습니다.'],
    foul:['아직 부족해요.'],
    out:['정확히 제가 원한 곳이에요.'],
    hit:['흠, 나쁘지 않네요.','조금은 인정하죠.'],
    extra:['제 공을 저렇게까지... 흥미롭네요.'],
    homer:['...당신, 이름이 뭐였죠?'],
    knockout:['오늘의 에이스는 당신이군요. 기억해 두겠어요.'],
  },
  // 바이올렛 스팅 — 25, violet undercut, mint eyes, sidearm sinker. Cool, blunt, a sting in few words.
  'regular-05-violet-sting':{
    entry:['빨리 끝내자.','따끔할 거야.'],
    chase:['물렸네.','뻔해.'],
    whiff:['느려.','찔렸지?'],
    strikeout:['끝.','독 돌았네.'],
    looking:['얼었어?','...겁먹었구나.'],
    walk:['쳇.'],
    foul:['운 좋네.'],
    out:['잡았다.'],
    hit:['...오.','좀 하네.'],
    extra:['방금 거, 아팠어.'],
    homer:['...너, 재밌다.'],
    knockout:['독이 안 통하네. 다음엔 더 깊이 찌를게.'],
  },
  // 로즈 페인트 — 26, dusty-rose bob, emerald eyes, corner painter. Playful, cute, affectionate teasing.
  'regular-06-rose-paint':{
    entry:['안녕~ 오늘 나랑 놀아줄 거지?','예쁘게 그려줄게, 삼진으로.'],
    chase:['어머어머, 낚였다~','귀여워. 또 속았어.'],
    whiff:['히히, 헛방!','나 보느라 공 못 봤지?'],
    strikeout:['삼진 완성~ 예쁘다!','다음에 또 놀러 와.'],
    looking:['구석에 살짝, 봤어?','에이, 쳐 주지.'],
    walk:['힝... 오늘 붓이 삐뚤었네.'],
    foul:['아깝다~ 조금만 더!'],
    out:['잡았다! 칭찬해 줘.'],
    hit:['어? 내 그림 망쳤어!','치사하게 잘 치네.'],
    extra:['너무해~ 다 번졌잖아!'],
    homer:['...멋있었어. 조금만.'],
    knockout:['졌다~ 다음엔 네 얼굴 그려줄게, 꼭.'],
  },
  // 코발트 임팩트 — 29, cobalt twin braids, power arm. Bold, loud, generous, loves strength.
  'elite-01-cobalt-impact':{
    entry:['힘 대 힘. 좋지?','피하지 마. 정면으로 와.'],
    chase:['그 스윙, 방향이 틀렸어!','힘만 들어갔네!'],
    whiff:['좋아! 그 기세야!','바람이 시원하다!'],
    strikeout:['다음엔 더 세게 와!','내 공이 더 무거웠지?'],
    looking:['쫄았어?','배트는 휘두르라고 있는 거야.'],
    walk:['오늘은 내가 힘이 넘쳤네.'],
    foul:['버텼다! 좋아!'],
    out:['정면 승부, 내 승!'],
    hit:['오! 받아쳤어!','그래, 이래야 재밌지!'],
    extra:['크, 손이 저려!'],
    homer:['하하! 너, 진짜 세다!'],
    knockout:['졌다! 시원하게 졌어. 다음 판, 기대할게!'],
  },
  // 네온 트릭 — 27, coral twisted bun, trickster. Mischievous, quick, a little smug.
  'elite-02-neon-trick':{
    entry:['내 손 잘 봐. 속지 말고~','트릭 하나 보여줄까?'],
    chase:['짠~ 속았지롱!','마술 성공!'],
    whiff:['어디 봐? 공은 여기 없어~','눈보다 손이 빨라.'],
    strikeout:['쇼 끝! 박수 쳐 줘.','세 번 연속 속다니, 최고의 관객!'],
    looking:['어리둥절?','그게 진짜 스트라이크였다니까.'],
    walk:['쳇, 트릭이 들켰네.'],
    foul:['오~ 반은 맞췄네.'],
    out:['잡았다! 이게 마지막 트릭.'],
    hit:['뭐야, 트릭 간파했어?','치사해~'],
    extra:['내 마술을 깨버리다니!'],
    homer:['...진짜 마술사는 너였네.'],
    knockout:['막 내릴게. 다음엔 더 화려한 거 준비할게.'],
  },
  // 와인 블러프 — 31, black hair with burgundy, copper eyes, closer who taunts. Slow, glamorous, alluring.
  'elite-03-wine-bluff':{
    entry:['천천히 즐겨. 밤은 기니까.','내 눈을 보면 공이 안 보일걸.'],
    chase:['취했니? 그 공엔 손대지 말았어야지.','유혹엔 약하구나.'],
    whiff:['후후, 조금 더 가까이 와.','흔들렸지?'],
    strikeout:['잔 비웠네. 잘 자.','달콤했지? 그게 끝이야.'],
    looking:['보기만 할 거야? 아까워라.','망설이는 모습, 귀엽네.'],
    walk:['...오늘은 내가 한 잔 샀다고 해 둘게.'],
    foul:['아직 안 끝났어.'],
    out:['블러프였어. 몰랐지?'],
    hit:['어머, 제법 취하지 않았네.','마음에 드는데.'],
    extra:['그 한 방... 향이 좋았어.'],
    homer:['...오늘 밤은 네 거야.'],
    knockout:['이번 병은 네가 땄네. 다음엔 내가 따라 줄게.'],
  },
  // 에메랄드 타이런트 — 32, emerald coiled ponytail, captain boss. Commanding, regal, a queen.
  'boss-01-emerald-tyrant':{
    entry:['무릎 꿇을 준비는 됐나?','여긴 내 왕국이다.'],
    chase:['내 허락 없이 손대지 마라.','그 욕심이 네 패배다.'],
    whiff:['어리석군.','공은 네 뜻대로 오지 않는다.'],
    strikeout:['물러가라.','이것이 왕좌의 무게다.'],
    looking:['경배하는 건가?','움직일 용기도 없군.'],
    walk:['...이번 한 번은 자비다.'],
    foul:['버티는군. 가상하다.'],
    out:['내 영토에서 벗어날 수 없다.'],
    hit:['감히.','흥, 조금은 쓸 만하군.'],
    extra:['내 왕관에 흠을 내다니.'],
    homer:['...인정하지. 너는 왕을 쓰러뜨릴 자다.'],
    knockout:['왕좌를 내주마. 하지만 다시 빼앗으러 오겠다.'],
  },
  // 플래티넘 헤일로 — 30, halo motif, high heat. Serene, angelic, gentle but merciless.
  'boss-02-platinum-halo':{
    entry:['빛 앞에 서는 걸 두려워하지 마.','축복해 줄게. 삼진으로.'],
    chase:['빛을 따라가면 길을 잃어.','가엾어라.'],
    whiff:['눈이 부셨구나.','괜찮아, 누구나 그래.'],
    strikeout:['편히 쉬어.','용서할게. 다음엔 조금 더 가까이 와.'],
    looking:['기도하고 있었니?','빛은 기다려 주지 않아.'],
    walk:['...오늘은 은총이야.'],
    foul:['아직 빛을 잡지 못했어.'],
    out:['돌아가렴.'],
    hit:['어머, 빛을 만졌네.','놀라워.'],
    extra:['그 한 방, 반짝였어.'],
    homer:['...너에게도 빛이 있었구나.'],
    knockout:['내 빛이 꺼졌네. 네 것이 더 밝았어.'],
  },
  // 블랙 이클립스 — 33, final boss closer. Quiet, dark, whispering, fateful.
  'boss-03-black-eclipse':{
    entry:['마지막이야. 끝까지 볼 수 있을까.','빛이 사라지는 순간을 봐.'],
    chase:['어둠 속에선 다 그렇게 속아.','손을 뻗었구나. 닿지 않는데.'],
    whiff:['...아무것도 없어.','그림자를 베었네.'],
    strikeout:['잘 자.','이제 캄캄해.'],
    looking:['보이지 않지?','숨 죽이고 있네.'],
    walk:['...잠깐, 달이 비켜 줬네.'],
    foul:['끈질기구나. 좋아.'],
    out:['어둠이 삼켰어.'],
    hit:['...빛이 새어 들었네.','흥미로워.'],
    extra:['일식이 흔들렸어.'],
    homer:['...너, 태양이었구나.'],
    knockout:['일식은 끝났어. 새벽이 네 편이었네.'],
  },
};

/* pick a line deterministically (the same pitch re-renders the same line) */
export function pitcherLine(artId,moment,seed=0){
  const lines=PITCHER_VOICE[artId]?.[moment];
  if(!lines?.length)return '';
  return lines[Math.abs(seed)%lines.length];
}

/* which moment a result is, from the ballpark verdict call */
export function momentOf({call,chased,knockedOut}){
  if(knockedOut)return 'knockout';
  if(chased)return 'chase';
  return {'헛스윙':'whiff','삼진':'strikeout','스트라이크':'looking','볼넷':'walk','파울':'foul','아웃':'out','안타':'hit','장타':'extra','홈런':'homer','만루 홈런':'homer'}[call]||null;
}
