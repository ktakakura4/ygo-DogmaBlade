// EaselJS系の読み込み
import { Shape, Stage, Bitmap, Container, Tween, Timeline} from 'createjs-module';
import { createButton }  from './createButton';
import Alpha from './Alpha.json';
import Beta from './Beta.json';
import Gamma from './Gamma.json';
const DEFAULT_LIFE = 8000;
const cardImgSize = {x:123,y:180,margin:10} 
// {x:122,y:178,margin:10} 

class Grid {
    front: number[][];
    back: number[][];

    constructor(front: number[][],back: number[][]) {
        this.front = front;
        this.back = back;
    }
}
class Game{
    field : Card[];
    monsterZone : Card[];
    spellOrTrapZone : Card[];
    graveYard : Card[];
    extra : Card[];
    deck : Card[];
    hand : Card[];
    myLifePoint : number;
    enemyLifePoint : number;
    normalSummon : boolean;
    grid : Grid;
    displayOrder : any;
    constructor(){
        this.field = [undefined];
        this.monsterZone = [undefined,undefined,undefined,undefined,undefined];
        this.spellOrTrapZone = [undefined,undefined,undefined,undefined,undefined];
        this.graveYard = [];
        this.extra = [];
        this.hand = [];
        this.deck = [];
        this.myLifePoint = DEFAULT_LIFE;
        this.enemyLifePoint= DEFAULT_LIFE;
        this.normalSummon = true;


        const front_position: number[][] = (() => {
            const array: number[][] = [];
            for(let i = 0; i < 7 ; i++){
                array.push([cardImgSize.x/2+20+(cardImgSize.y+cardImgSize.margin)*i,cardImgSize.y/2+20]);
            }
            return array
        })();

        const back_position = (() => {
            const array: number[][] = [];
            for(let i = 7; i < 14 ; i++){
                array.push([cardImgSize.x/2+20+(cardImgSize.y+cardImgSize.margin)*(i-7),cardImgSize.y*1.5+40]);
            }
            return array
        })();

        this.grid = new Grid(front_position, back_position);

        this.displayOrder  = {
                field:[this.grid.front[0]],
                mon:[this.grid.front[3],this.grid.front[2],this.grid.front[4],this.grid.front[1],this.grid.front[5]],
                gy:[this.grid.front[6]],
                ex:[this.grid.back[0]],
                st:[this.grid.back[3],this.grid.back[2],this.grid.back[4],this.grid.back[1],this.grid.back[5]],
                deck:[this.grid.back[6]],
                hand:[this.grid.front[3][0],this.grid.front[3][1]*5]
                    };
    }
}

class Card {
    frontImg : Bitmap;  cardBackImg : Bitmap;
    imageFileName : String;  cardBackImageFileName : String;
    ID : Number;
    cardName : String;
    location : "MO"|"ST"|"FIELD"|"DECK"|"HAND"|"GY"|"DD";
    fromLocation : String;
    imgContainer : Container;
    cardType : "Monster"|"Spell"|"Trap";
    face : "UP"|"DOWN" ;
    constructor(){
        this.cardBackImageFileName = "cardback.jpeg";
        this.location = "DECK"
        this.face = "DOWN"
    }
}

class MonsterCard extends Card {
    monsterType : "Normal"|"Effect";
    level : Number;
    race : String;
    attribute : String;
    atkPoint : Number;
    defPoint : Number;
    position : "ATK"|"DEF";
    canNS : Boolean
    NSed : Boolean;
    actionPossible : {key: boolean[]}; 
    constructor(){
        super();
        this.cardType = "Monster";
        this.canNS = true;
    }
}

class SpellCard extends Card {
    spellType : "Normal"|"Quick"|"Equip"|"Field"|"Continuous";
    actionPossible : {key: boolean[]};
    effectArray : {[n: number]:{[s: string]: string|number|string[]}}; 
    effect : Function
    constructor(){
        super();
        this.cardType = "Spell"
        
    }
}


/**
 * jsonからカードオブジェクト生成
 */
const generateMonsterCard = (json:Object) => {
    const newCard = new MonsterCard;
    Object.keys(json).map((key, index, array) => {
        newCard[key] = json[key]
    });
    return newCard;
}

window.onload = function() {

    /**
     * 指定のstageに指定のcardを指定座標で描画する
     * 
     * @param stage ステージ
     * @param card 
     * @param x 座標
     * @param y 座標
     */
    function puton(stage:Stage, card: Card,x: number, y: number){
        card.imgContainer = new createjs.Container();
        stage.addChild(card.imgContainer);
        card.imgContainer.cursor = "pointer";

        card.frontImg = new createjs.Bitmap(card.imageFileName);
        card.imgContainer.addChild(card.frontImg)
        card.frontImg.regX = cardImgSize.x/2;
        card.frontImg.regY = cardImgSize.y/2;
        card.frontImg.scaleX = 0;

        card.cardBackImg = new createjs.Bitmap(card.cardBackImageFileName);
        card.imgContainer.addChild(card.cardBackImg)
        card.cardBackImg.regX = cardImgSize.x/2;
        card.cardBackImg.regY = cardImgSize.y/2;

        card.imgContainer.regX = 0;
        card.imgContainer.regY = 0;

        [card.imgContainer.x,card.imgContainer.y] = [x,y];
    }

    /**
     * ボードのカード置き場の枠を描画する
     */
    const setBoard = (stage:Stage) => {
        const drawzone = (x,y,i) => {
            let zone = new createjs.Shape();
            // 線の色
            zone.graphics.beginStroke("#0055bb");
            // 枠を描く
            zone.graphics.drawRect((cardImgSize.y-cardImgSize.x)/2, 0, cardImgSize.x, cardImgSize.y);
            if((1<=i && i<=5)){
                zone.graphics.drawRect(0, (cardImgSize.y-cardImgSize.x)/2, cardImgSize.y, cardImgSize.x);
            };
            stage.addChild(zone);
            zone.regX = cardImgSize.y/2;
            zone.regY = cardImgSize.y/2;
            zone.x = x;
            zone.y = y;
        };

        for(let i = 0; i < 14 ; i++){
            const target = (() => {
                if(i < 7){
                    return game.grid.front[i];
                }else{
                    return game.grid.back[i-7];
                };
            })();
            drawzone(target[0],target[1],i);
        }
    }
    /**
     * カードオブジェクトを場から墓地に移動
     */
    const BoardToGY = async(card: Card) => {
            const fromZone = (() => {
            if(card instanceof MonsterCard){
                return game.monsterZone;
            };
            if(card instanceof SpellCard){
                if(card.spellType=="Field"){
                    return game.field;
                }else{
                    return game.spellOrTrapZone;
                };
            }
            // TODO: Trapのことあとでかく
            return game.spellOrTrapZone;
        })();

        fromZone[fromZone.indexOf(card)]=void 0;
        game.graveYard.push(card);
        card.location = "GY";
        return;
        
    }

    /**
     * カードを場から墓地に送るアニメーション
     */
    const animationBoardToGY = async(card: Card) => {

            const toX : number = game.displayOrder.gy[0][0]+(game.graveYard.length-1)*2
            const toY : number = game.displayOrder.gy[0][1]-(game.graveYard.length-1)*2

            if (card.face=="DOWN"){
                cardFlip(card);
            };
            createjs.Tween.get(card.imgContainer)
                .to({x:toX,y:toY,rotation:0},500,createjs.Ease.cubicOut)
                .call(()=>{return});
    }

    /**
     * チェーンに乗る効果発動アニメーション
     */
    const animationChainEffectActivate = async(card: Card) => {
        const effImg = new createjs.Bitmap(card.imageFileName);
        effImg.regX = cardImgSize.x/2;
        effImg.regY = cardImgSize.y/2;
        card.imgContainer.addChild(effImg);
        createjs.Tween.get(effImg)
                .to({scaleX:3,scaleY:3,alpha:0},500,createjs.Ease.cubicOut)
                .call(()=>{card.imgContainer.removeChild(effImg)})
                .call(()=>{return});
    }

    /**
     * 手札の魔法発動
     */
    const handSpellActivate = async(card: SpellCard) => {
        handToBoard(card);
        await animationHandToBoard(card,"ATK");
        await animationChainEffectActivate(card);
        await card.effect;
        await BoardToGY(card);
        await animationBoardToGY(card);
        return
    }

    /**
     * 通常召喚する
     */
    const normalSummon = async(card: MonsterCard, position: "ATK"|"SET") => {
        // game.normalSummon = false;
        card.NSed=true;
        handToBoard(card);
        if(position=="ATK"){
            card.position=position;
            card.face="UP";
        }else{
            card.position="DEF";
            card.face="DOWN";
        };
        await animationHandToBoard(card,position);
        await animationChainEffectActivate(card);
        return;
    }
    
    /**
     * 通常召喚可能か判定する
     */
    const JudgeNS = (card : MonsterCard) => {
        if(card.level<=4){
            return(game.normalSummon && card.canNS);
        }else{
            let countMonster:number = game.monsterZone.filter(i => i === undefined).length
            return(game.normalSummon && card.canNS && 0<=countMonster);
        }
    }

    /**
     * カードオブジェクトを手札から場に移動
     */
    const handToBoard = async(card: Card) => {
        const targetZone = (() => {
            if(card instanceof MonsterCard){
                card.location = "MO";
                return game.monsterZone;
            };
            if (card instanceof SpellCard){
                if(card.spellType=="Field"){
                    card.location = "FIELD";
                    return game.field;
                }else{
                    card.location = "ST";
                    return game.spellOrTrapZone;
                }
            };
            // トラップあとでかく
            return game.spellOrTrapZone;
        })();
        targetZone.splice( targetZone.indexOf(undefined), 1, card);
        game.hand = game.hand.filter(n => n !== card);
        return;

    };

    /**
     * カードを手札から場に移動するアニメーション
     */
    const animationHandToBoard = async(card: Card, position: "ATK"|"DEF"|"SET") => {
        const toGrid = () => {
            if(card instanceof MonsterCard){
                let toX : Number = game.displayOrder.mon[game.monsterZone.indexOf(card)][0];
                let toY : Number = game.displayOrder.mon[game.monsterZone.indexOf(card)][1];
                return{toX,toY};
            }
            else{
                let toX : Number = game.displayOrder.st[game.spellOrTrapZone.indexOf(card)][0];
                let toY : Number = game.displayOrder.st[game.spellOrTrapZone.indexOf(card)][1];
                return{toX,toY};
            };
        };
        const {toX,toY} = toGrid();
        const TWEEN = (() => {
            if(position=="ATK"){
                return createjs.Tween.get(card.imgContainer)
                    .call(()=>{animationHandAdjust()})
                    .to({x:toX,y:toY},500,createjs.Ease.cubicOut);
            };
            if(position=="SET"){
                if(card instanceof MonsterCard){
                    return createjs.Tween.get(card.imgContainer)
                            .call(()=>{animationHandAdjust()})
                            .call(()=>{cardFlip(card)})
                            .to({x:toX,y:toY,rotation:-90},500,createjs.Ease.cubicOut);
                };
                if(card instanceof SpellCard){
                    return createjs.Tween.get(card.imgContainer)
                            .call(()=>{animationHandAdjust()})
                            .call(()=>{cardFlip(card)})
                            .to({x:toX,y:toY},500,createjs.Ease.cubicOut);
                };
            };
        });
        stage.setChildIndex(card.imgContainer,stage.numChildren-1);
        TWEEN.call(()=>{return})
        };

    /**
     * デッキをシャッフルする
     */
    function deckShuffle(){
        if(game.deck.length <= 1) {
            return false;
        }
        game.deck = shuffle(game.deck)
        game.deck.map((card, index, array) => {
            const orgX = card.imgContainer.x
            createjs.Tween.get(card.imgContainer)
                .wait(index*(100/array.length))
                .to({x:orgX+100-(200*(index%2))},100)
                .to({x:orgX-100+(200*(index%2))},200)
                .to({x:game.displayOrder.deck[0][0]+index*2,y:game.displayOrder.deck[0][1]-index*2},100)
                .call(()=>{stage.setChildIndex(card.imgContainer,stage.numChildren - array.length + index)})
        });
    }

    /**
     * 配列をランダム化
     */
    const shuffle = (target:Card[]) => {
        for (let i = target.length - 1; i >= 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [target[i], target[j]] = [target[j], target[i]];
        }
        return target;
    }

    /**
     * 表裏反転
     */
    const cardFlip = async(card:Card) => {
        const front = createjs.Tween.get(card.frontImg);
        const back = createjs.Tween.get(card.cardBackImg);
        const close = async(target:Tween) => {
            target.to({scaleX:0.0},250,createjs.Ease.cubicOut)
                .call(()=>{return});
        };
        const open = async(target:Tween) => {
            target.to({scaleX:1.0},250,createjs.Ease.cubicIn)
                .call(()=>{return});
        };

        if(card.face=="UP"){
            card.face = "DOWN";
            await close(front);
            await open(back);
            return;
        }else{
            card.face = "UP";
            await close(back);
            await open(front);
            return;
        };
    }

    /**
     * デッキを場に置く
     */
    function deckset(stage: Stage, deck:Card[]){
        game.deck = deck;
        game.deck.map((card, index, array) => {
            puton(stage, card, game.displayOrder.deck[0][0]+index*2,game.displayOrder.deck[0][1]-index*2);
        })
    }

    /**
     * 手札を現在のデータに合わせた位置に移動するアニメーション
     * 手札出し入れの際に呼ぶやつ
     */
    const animationHandAdjust = async () => {  
        const leftEndPosition = game.displayOrder.hand[0] - (game.hand.length - 1) / 2 * (cardImgSize.x+cardImgSize.margin)
        const TWarray :Tween[] = [];

        game.hand.map(async(card, index, array) => {
            const tw = () => {
                if(card.face=="DOWN"){
                    return createjs.Tween.get(card.imgContainer) 
                        .call(()=>{cardFlip(card)})
                        .to({x:leftEndPosition+((cardImgSize.x+cardImgSize.margin)*index),y:game.displayOrder.hand[1]},500,createjs.Ease.cubicInOut);
                }else{
                    return createjs.Tween.get(card.imgContainer) 
                        .to({x:leftEndPosition+((cardImgSize.x+cardImgSize.margin)*index),y:game.displayOrder.hand[1]},500,createjs.Ease.cubicInOut);
                };
            };
            TWarray.push(tw());
        });
        TWarray.map((tw, index, array) => {
            if(index+1 < array.length){
                tw;
            }else{
                tw.call(()=>{return})
            }
        });
    };

    /**
     * デッキから任意の枚数をドローする
     * @param count
     */
    const draw = async (count: number) => {    
        for(let i = 0; i < count ; i++){
            // デッキ残り枚数が０だったら引けない
            if(game.deck.length < 1) {
                console.log("deck0");
                return false;
            };

            const targetCard = game.deck.pop();
            targetCard.location = "HAND";
            game.hand.push(targetCard);

            game.hand.map((h,i,a) =>{ console.log("hand: " + h.cardName)})
            game.deck.map((h,i,a) =>{ console.log("deck: " + h.cardName)})

            await animationHandAdjust();
            HandButtonSetting(targetCard);
        };
        return true
    } 
    
    /**
     * 手札ボタン設定
     */
    function HandButtonSetting(card:Card){
        // ボタン生成
        const NSButton = createButton("NS", cardImgSize.x, 40, "#0275d8");
        const ActivateButton = createButton("ACTIVEATE", cardImgSize.x, 40, "#0275d8");
        const SETButton = createButton("SET", cardImgSize.x, 40, "#0275d8");
        // カードタイプ毎のボタンリスト
        const handButton = {"Monster":[NSButton,SETButton],"Spell":[ActivateButton,SETButton],"Trap":[SETButton]}

        // カードイメージコンテナにボタン追加、非表示にする
        if(card instanceof MonsterCard){
            handButton.Monster.map((button, index, array) => {
                card.imgContainer.addChild(button);
                button.visible = false;
            })
        }else{
            if(card instanceof SpellCard){
                handButton.Spell.map((button, index, array) => {
                    card.imgContainer.addChild(button);
                    button.visible = false;
                })
            }
        }

        //Hand MouseOver
        card.imgContainer.addEventListener("mouseover", handleHandMover);
        /**
         * 条件を満たすボタンを表示
         */
        function handleHandMover(event) {
            const disprayButton = (() => {
                if(card instanceof MonsterCard){
                    if(JudgeNS(card)){
                        return [NSButton,SETButton];
                    };
                };
                if (card instanceof SpellCard){
                    return [ActivateButton,SETButton];
                };
            });

            // const disprayButton : Container[] = [];
            // if(card instanceof MonsterCard){
            //     if(JudgeNS(card)){
            //         disprayButton.push(NSButton);
            //         disprayButton.push(SETButton);
            //     };
            // };

            disprayButton().map((button, index, array) => {
                button.x = -cardImgSize.x/2;
                button.y = 40*(array.length-2) + 40*(index) + 10;
                button.visible = true 
            });
            
        }

        //Hand MouseOut
        card.imgContainer.addEventListener("mouseout", handleHandMout);
        /**
         * 全てのボタンを非表示
         */
        function handleHandMout(event) {
            if(card instanceof MonsterCard){
                handButton.Monster.map((button, index, array) => {
                    button.visible = false;
                })
            }
            if(card instanceof SpellCard){
                handButton.Spell.map((button, index, array) => {
                    button.visible = false;
                })
            }
        };

        //Handボタンクリック 
        //mouseover,outイベント消去
        NSButton.addEventListener("click",handleNSbuttonClick);
        function handleNSbuttonClick(event) {
            if(card instanceof MonsterCard){
                normalSummon(card,"ATK");
                card.imgContainer.removeChild(NSButton);
                card.imgContainer.removeChild(SETButton);
            };
            card.imgContainer.removeAllEventListeners();
        };

        SETButton.addEventListener("click",handleSETbuttonClick);
        function handleSETbuttonClick(event) {
            if(card instanceof MonsterCard){
                normalSummon(card,"SET");
                card.imgContainer.removeChild(NSButton);
                card.imgContainer.removeChild(SETButton);
            };
            if(card instanceof SpellCard){
                handToBoard(card)
                animationHandToBoard(card,"SET");
                card.imgContainer.removeChild(ActivateButton);
                card.imgContainer.removeChild(SETButton);
            };
            card.imgContainer.removeAllEventListeners();
        };

        ActivateButton.addEventListener("click",handleACTbuttonClick);
        function handleACTbuttonClick(event) {
            if(card instanceof SpellCard){
                handSpellActivate(card);
                card.imgContainer.removeChild(ActivateButton);
                card.imgContainer.removeChild(SETButton);
            };
            card.imgContainer.removeAllEventListeners();
        };
    };

    const game = new Game;
    const stage = new createjs.Stage("canv");
    stage.enableMouseOver();

    setBoard(stage);

    const ALPHA = generateMonsterCard(Alpha);
    const BETA = generateMonsterCard(Beta);
    const GAMMA = generateMonsterCard(Gamma);
    
    const potOfGreed = new SpellCard
    potOfGreed.effectArray = {
    1:{"EffctType":"Ignnition",
        "spellSpeed":1,
        "range":["field"],
        "target":undefined}
    }
    potOfGreed.imageFileName = "PotOfGreed.png"
    potOfGreed.effect = async() => {
        await draw(2); 
        return;   
    };

    const myDeck : Card[]= [ALPHA,BETA,GAMMA,potOfGreed];
    deckset(stage, myDeck);
    console.log(game.deck); 



    const drawButton = createButton("draw", 150, 40, "#0275d8");
    drawButton.x = 1200;
    drawButton.y = 450;
    stage.addChild(drawButton);

    drawButton.on("click", function(e){
        draw(1);
    }, null, false);

    const shuffleButton = createButton("shuffle", 150, 40, "#0275d8");
    shuffleButton.x = 1200;
    shuffleButton.y = 500;
    stage.addChild(shuffleButton);

    shuffleButton.on("click", function(e){
        deckShuffle();
    }, null, false);

    createjs.Ticker.addEventListener("tick", handleTick);
    function handleTick() {
        stage.update();
    }
}
