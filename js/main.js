;'use strict';

//Второстепенные задачи
/*
  TODO: Заменить for in на функцию перебора из jQuery - Готово!
  TODO: Сделать классовые бонусы (Пассивные способности)
         TODO: Выполнить проверку на бесконечные эффекты

  TODO: Постараться избавиться от глобальных переменных
  TODO: Написать ИИ (Средний и сложный)
*/

//Главные задачи
/*
  TODO: Пересмотреть системы ходов - Готово!
  TODO: Отладить работу переодических умений - Готово!
  TODO: Финальный рефакторинг
  TODO: Сдача проекта!

  - Около одной недели -
*/

//JSDoc
/**
 * @param {{imagePathLH, imagePathRH,
  *         class, level,
  *         HP, MP, PD, MD, BD,
  *         strength, agility, intelligence, stamina, defense,
  *         firstSkill, secondSkill,
   *        manaCost, HPRestoreScale, MPRestoreScale
   *        PDScale, MDScale,
   *        periodicPD, periodicMD,
    *       PDIncrease, MDIncrease,
    *       PDReduction, MDReduction,
     *      parametersIncrease,
     *      classBonus,
     *      skillNumber, repeatedSkill,
      *     currentSkill, threshold:string}} data
 */

//Abbreviations
/*

  LHero - Left Hero
  RHero - Right Hero

  HP - Health Points
  MP - Mana Points

  Char - Character
  Max - Maximum

  AI - Artificial Intelligence

*/

//Объявляем все, используемые далее в коде, глобальные переменные
var charInfo,
    charNames = [],
    gameContent = $('main'),

    LHeroStatus = {},
    RHeroStatus = {},

    turnQuantity = 0,

    usedHealthPotion = false,
    usedManaPotion = false;

//Запрашиваем JSON-данные с информацией об имеющихся в игре персонажах
$.ajax({
  url: "/data/characters.json",
  dataType: 'json',
  success: getData
});

/*
  Если JSON-данные успешно получены - присвоить их глобальной переменной charInfo
  Заполняем массив charNames именами всех персонажей
  Запускаем функцию инициализации приложения
*/
function getData(response) {
  charInfo = response;

  //Заполняем массив именами доступных персонажей
  charInfo.forEach(function(element) {
    charNames.push(element.name);
    calcBasicParameters(element);
  });

  initApp();
}

//Функция для расчета боевых характеристик
function calcBasicParameters(currentHero) {
  //Смотря на название класса - скалируем и вписываем боевые параметры
  //Расчет можно найти по данному пути: ../docs/characteristics.txt
  switch ( currentHero.class ) {
    case 'Barbarian':
      currentHero.HP = currentHero.stamina * 50;
      currentHero.MP = currentHero.intelligence * 30;
      currentHero.PD = currentHero.agility * 2 + currentHero.strength;
      currentHero.MD = currentHero.intelligence;
      currentHero.BD = currentHero.defense * 2;
      break;

    case 'Death Knight':
    case 'Warrior':
      currentHero.HP = currentHero.stamina * 50;
      currentHero.MP = currentHero.intelligence * 30;
      currentHero.PD = currentHero.strength * 2 + currentHero.agility;
      currentHero.MD = currentHero.intelligence;
      currentHero.BD = currentHero.defense * 2;
      break;

    case 'Wizard':
    case 'Paladin':
    case 'Warlock':
      currentHero.HP = currentHero.stamina * 50;
      currentHero.MP = currentHero.intelligence * 30;
      currentHero.PD = currentHero.strength + currentHero.agility;
      currentHero.MD = currentHero.intelligence * 3;
      currentHero.BD = currentHero.defense * 2;
      break;
  }
}

//Устанавливаем обработчики на пункты меню и на кнопки возвращения к начальному экрану
function initApp() {
  gameContent.on('click', 'li', function() {
    switch ( $(this).attr('id') ) {
      case 'new-game':
        /*
          Открываем окно "Выбора персонажа"
          Вызываем функцию для проверки выбора
        */
        gameContent.load('../newGame.html', function() {
          initHeroSelect();
          checkSelect();
        });
        break;

      case 'heroes-list':
        /*
           Заполняем таблицы полученным данными
           Вешаем обработчики на окна с персонажами
        */
        gameContent.load('../listOfHeroes.html', function() {
          initTables();
          initHandlers();
        });
        break;
        //Открываем "Описание"
      case 'game-description':
        gameContent.load('../description.html');
        break;
    }
  });

  gameContent.on('click', '.back-btn', function() {
    gameContent.load('../index.html main');
  });
}

/*
  Заполняем информацией о персонажах пустые DOM-элементы
  Устанавливаем обработчики на персонажей
*/
function initHeroSelect() {
  //Заполняем поля с именами персонажей
  $('section.hero-select div h3').each(function(index, element) {
    $(element).html(charInfo[index].name);
  });

  //Заполняем поля с титулами персонажей
  $('section.hero-select div p').each(function(index, element) {
    $(element).html(charInfo[index].title);
  });

  /*
    Проверяем, был ли выбран персонаж (Присутствует класс selected)
    Если выбран - снимаем с него класс selected
    Если не выбран - перебираем всех персонажей и снимаем с них класс selected, вешаем его на выбранного персонажа,
    прячем предупреждение о том, что ни один персонаж не был выбран
  */
  $('section.hero-select').on('click', 'div', function() {
    if ( $(this).hasClass('selected') ) {
      $(this).removeClass('selected');
    } else {
      $('section.hero-select div').each(function(index, element) {
        $(element).removeClass('selected');
      });
      $(this).addClass('selected');
      $('section.hero-select #warning').addClass('hide');
    }
  });
}

//Записываем имя (Содержимое h3) в отдельную переменную и передаем ее следующей функции
function checkSelect() {
  var selectedCharName;

  //Обработчик на кнопке 'Accept' проверяет начилие класса selected у персонажей
  gameContent.on('click', '#accept', function() {
    $('section.hero-select div').each(function(index, element) {
      /*
        Если класс selected есть - записываем имя (h3) персонажа в переменную
        Вызываем функцию showArena, для переключения интерфейсов
      */
      if ( $(element).hasClass('selected') ) {
        selectedCharName = $('section.hero-select .selected h3').html();
        switchInterface();
        initLHeroInterface(selectedCharName);
        selectRandomEnemy();
        initTurn();
      } else {
        //Если класса selected нет - показываем предупреждение, о том, что не был выбран ни один из персонажей
        $('section.hero-select #warning').removeClass('hide');
      }
    });
  });
}

//Закрываем интерфейс с выбором персонажа и открываем интерфейс с ареной
function switchInterface() {
  $('section.hero-select').addClass('hide');
  $('section.arena').removeClass('hide');
}

//Заполняем интерфейс, выбранного игроком, персонажа
function initLHeroInterface(selectedCharName) {
  /*
    Перебираем массив с именами персонажей
    Если имя из массива совпадает с именем выбранного персонажа - записываем его объект в переменную
  */
  charNames.forEach(function(element, index) {
    if ( element === selectedCharName ) {
      LHeroStatus = charInfo[index];
      LHeroStatus.maxMP = charInfo[index].MP; //Добавляем статичное значение максимального запаса маны
      LHeroStatus.maxHP = charInfo[index].HP; //Добавляем статичное значение максимального запаса здоровья
    }
  });

  //Заполняем интерфейс игрока, информацией о выбранном персонаже
  $('.left-hero .character-info img').attr('src', LHeroStatus.imagePathLH); //Изображение
  $('.left-hero .character-info h3'). html(LHeroStatus.name);               //Имя
  $('.left-hero .character-info p').  html(LHeroStatus.title);              //Титул

  $('.left-hero .health .max-value').html     (LHeroStatus.maxHP); //Максимальное HP
  $('.left-hero .mana .max-value').html       (LHeroStatus.maxMP); //Максимальное MP
  $('.left-hero .health .current-value').html (LHeroStatus.HP);    //Текущее HP
  $('.left-hero .mana .current-value').html   (LHeroStatus.MP);    //Текущее MP
}

//Выбираем случайного, не совпадающего с персонажем игрока, противника
function selectRandomEnemy() {
  //В переменной храними имя персонажа игрока
  var LHeroCharName = $('.left-hero .character-info h3').html();

  //Перебираем массив с именами
  charNames.forEach(function(element, index) {
    //Если имя из массива совпадает с именем выбранного персонажа, то...
    if ( element === LHeroCharName ) {
      /*
        Создаем бесконечный цикл, в котором генерируем случайное число в диапазоне количества персонажей
        И если число не совпадает с номером нашего персонажа - прерываем цикл
        И вызываем функцию для заполнение интерфейса противника, в которую передаем номер случайного противника
      */
      while (true) {
        var randomRHero = Math.floor(Math.random() * ((charInfo.length - 1) + 1));

        if (randomRHero !== index) {
          initRHeroInterface(randomRHero);
          break;
        }
      }
    }
  });
}

//Функция для хранения счетчика ходов и манипулирования управлением персонажами
function initTurn() {
  turnQuantity++;

  //Создаем log-объект для отображение текущего хода и персонажа
  var newTurn = {
    logName: 'newTurn',
    turnNum: turnQuantity
  };

  /*
    В зависимости от номера хода, передаем управление определенному персонажу
    Если ход четный - ход противника (ИИ)
    Если ход нечетный - ход игрока
  */
  if ( turnQuantity % 2 === 0 ) {
    newTurn.currentHero = $('.right-hero h3').html();
    initPassiveSkill(RHeroStatus, LHeroStatus);
    switchEnemy();
    rightHeroTurn();
  } else {
    newTurn.currentHero = $('.left-hero h3').html();
    initPassiveSkill(LHeroStatus, RHeroStatus);
    switchEnemy();
    leftHeroTurn();
  }

  logInfo(newTurn);
}

//TODO: Решить проблему с undefined уроном у левого героя

/*
  Инициализация хода игрока (Левого персонажа)
  Расчитываем активные и пассивные умения, проверяем наличие переодических эффектов
  Выключаем обработчики на умениях противоположного персонажа
  После какого-либо действия - передаем ход следующему персонажу
*/
function leftHeroTurn() {
  initPassiveSkill(LHeroStatus, RHeroStatus);

  gameContent.on('click', '.left-hero .action-bar img', function() {
    initBasicSkill.call(this, LHeroStatus, RHeroStatus);
    observePerSkill.call(LHeroStatus, LHeroStatus);

    if (this) initTurn();
  });

  gameContent.off('click', '.right-hero .action-bar img');
}

/*
  Инициализация хода противника (ИИ) (Правого персонажа)
  Проделываем теже действия, что и с персонажем игрока
*/
function rightHeroTurn() {
  initPassiveSkill(RHeroStatus, LHeroStatus);

  gameContent.on('click', '.right-hero .action-bar img', function() {
    initBasicSkill.call(this, RHeroStatus, LHeroStatus);
    observePerSkill.call(RHeroStatus, RHeroStatus);
  });

  createEasyAI();
  gameContent.off('click', '.left-hero .action-bar img');
}

//Меняем классы enemy и current-hero, в зависимости от действующего персонажа
function switchEnemy() {
  var leftHero = $('div.left-hero'),
    rightHero = $('div.right-hero');

  if ( leftHero.hasClass('current-hero') ) {
    leftHero.removeClass('current-hero')
      .addClass('enemy');

    rightHero.removeClass('enemy')
      .addClass('current-hero');
  } else {
    leftHero.removeClass('enemy')
      .addClass('current-hero');

    rightHero.removeClass('current-hero')
      .addClass('enemy');
  }
}

//Заполняем интерфейс персонажа противника
function initRHeroInterface(randomRHero) {
  //Объект с данными о случайно выбранном противнике
  RHeroStatus = charInfo[randomRHero];
  RHeroStatus.maxMP = charInfo[randomRHero].MP; //Добавляем статичное значение максимального запаса маны
  RHeroStatus.maxHP = charInfo[randomRHero].HP; //Добавляем статичное значение максимального запаса здоровья

  //Заполняем интерфейс противника, информацией о персонаже
  $('.right-hero .character-info img').          attr('src', RHeroStatus.imagePathRH);    //Изображение
  $('.right-hero .character-info h3').           html(       RHeroStatus.name);           //Имя
  $('.right-hero .character-info p').            html(       RHeroStatus.title);          //Титул

  $('.right-hero .health .max-value').html     (RHeroStatus.maxHP); //Максимальное HP
  $('.right-hero .mana .max-value').html       (RHeroStatus.maxMP); //Максимальное MP
  $('.right-hero .health .current-value').html (RHeroStatus.HP);    //Текущее HP
  $('.right-hero .mana .current-value').html   (RHeroStatus.MP);    //Текущее MP
}

//Инициализируем базовые умения (Атака, пропустить ход, зелья здоровья/маны) выбранного персонажа
function initBasicSkill(currentHero, enemyHero) {
  switch ( $(this).attr('class') ) {

    case 'attack':
      var attackResult = {
        logName: 'attackResult',
        currentHeroName: currentHero.name,
        enemyHeroName: enemyHero.name
      };

      if ( currentHero.perPDIncrease && enemyHero.passivePDR ) {
        debugger;
        console.log('PDI & PDR');
        enemyHero.HP -= currentHero.PD + currentHero.perPDIncrease.value - enemyHero.passivePDR.value;
        attackResult.dealDamage = currentHero.PD + currentHero.perPDIncrease.value - enemyHero.passivePDR.value;
        attackResult.enemyHeroHP = enemyHero.HP;
      } else if ( currentHero.perPDIncrease ) {
        console.log('PDI');
        enemyHero.HP -= currentHero.PD + currentHero.perPDIncrease.value;
        attackResult.dealDamage = currentHero.PD + currentHero.perPDIncrease.value;
        attackResult.enemyHeroHP = enemyHero.HP;
      } else if ( enemyHero.passivePDR ) {
        console.log('PDR');
        enemyHero.HP -= currentHero.PD - enemyHero.passivePDR.value;
        attackResult.dealDamage = currentHero.PD - enemyHero.passivePDR.value;
        attackResult.enemyHeroHP = enemyHero.HP;
      } else {
        enemyHero.HP -= currentHero.PD;
        attackResult.dealDamage = currentHero.PD;
        attackResult.enemyHeroHP = enemyHero.HP;
      }

      alterationInterface();
      logInfo(attackResult);
      break;

    case 'move-skip':
      var moveSkip = {
        logName: 'moveSkip',
        currentHeroName: currentHero.name
      };

      logInfo(moveSkip);
      break;

    case 'health-potion':
      if ( usedHealthPotion ) {
        currentHero.HPBan = {
          heroName: currentHero.name,
          ban: true
        };
      } else {
        usedHealthPotion = true;

        if ( currentHero.HP >= currentHero.maxHP ) {
          var banHPPotion = {
            logName: 'banHPPotion',
            heroName: currentHero.name
          };

          logInfo(banHPPotion);
        } else {
          currentHero.HP += 50;
          alterationInterface();

          var currentHeroHP = {
            logName: 'currentHeroHP',
            heroName: currentHero.name,
            heroHP: currentHero.HP
          };

          logInfo(currentHeroHP);
        }
      }
      break;

    case 'mana-potion':
      if ( usedManaPotion ) {
        currentHero.MPBan = {
          heroName: currentHero.name,
          ban: true
        };

      } else {
        usedManaPotion = true;
        currentHero.MP += 30;
        alterationInterface();

        var currentHeroMP = {
          logName: 'currentHeroMP',
          heroName: currentHero.name,
          heroMP: currentHero.MP
        };

        logInfo(currentHeroMP);
      }
      break;

    case 'first-skill':
      if ( currentHero.firstSkill.manaCost > currentHero.MP ) {
        var notEnoughManaFS = {
          logName: 'notEnoughManaFS',
          heroName: currentHero.name,
          skillName: currentHero.firstSkill.name
        };

        logInfo(notEnoughManaFS);
      } else initActiveSkill.call(currentHero.firstSkill, currentHero, enemyHero);
      break;

    case 'second-skill':
      if ( currentHero.secondSkill.manaCost > currentHero.MP ) {
        var notEnoughManaSS = {
          logName: 'notEnoughManaSS',
          heroName: currentHero.name,
          skillName: currentHero.secondSkill.name
        };

        logInfo(notEnoughManaSS);
      } else initActiveSkill.call(currentHero.secondSkill, currentHero, enemyHero);
      break;
  }
}

/*
  Обновляем интерфейс персонажей
  Количество текущего, максимального значений здоровья и маны у обоих игроков
*/
function alterationInterface() {
  //Выставляем HP (LHero) в нулевое значение, если оно меньше или равно нулю
  if ( LHeroStatus.HP <= 0 ) {
    LHeroStatus.HP = 0;
    $('.left-hero .health .current-value').html(LHeroStatus.HP);
  } else {
    $('.left-hero .health .current-value').html(LHeroStatus.HP);
  }

  //Выставляем HP (LHero), в максимальное значение, если оно больше или равно максимальному значению
  if ( LHeroStatus.HP >= LHeroStatus.maxHP ) {
    LHeroStatus.HP = LHeroStatus.maxHP;
    $('.left-hero .health .current-value').html(LHeroStatus.HP)
  } else {
    $('.left-hero .health .current-value').html(LHeroStatus.HP);
  }

  //Выставляем MP (LHero) в нулевое значение, если оно меньше или равно нулю
  if ( LHeroStatus.MP <= 0 ) {

  }

  //Выставляем MP (LHero), в максимальное значение, если оно больше или равно максимальному значению
  if ( LHeroStatus.MP >= LHeroStatus.maxMP ) {
    LHeroStatus.MP = LHeroStatus.maxMP;
    $('.left-hero .mana .current-value').html(LHeroStatus.MP)
  } else {
    $('.left-hero .mana .current-value').html(LHeroStatus.MP);
  }

  //--------------------------------------------------------------------------------------------------------------------

  //Выставляем HP (RHero) в нулевое значение, если оно меньше или равно нулю
  if ( RHeroStatus.HP <= 0 ) {
    RHeroStatus.HP = 0;
    $('.right-hero .health .current-value').html(RHeroStatus.HP);
  } else {
    $('.right-hero .health .current-value').html(RHeroStatus.HP);
  }

  //Выставляем HP (RHero), в максимальное значение, если оно больше или равно максимальному значению
  if ( RHeroStatus.HP >= RHeroStatus.maxHP ) {
    RHeroStatus.HP = RHeroStatus.maxHP;
    $('.right-hero .health .current-value').html(RHeroStatus.HP)
  } else {
    $('.right-hero .health .current-value').html(RHeroStatus.HP);
  }

  //Выставляем MP (RHero) в нулевое значение, если оно меньше или равно нулю
  if ( RHeroStatus.MP <= 0 ) {

  }

  //Выставляем MP (RHero), в максимальное значение, если оно больше или равно максимальному значению
  if ( RHeroStatus.MP >= RHeroStatus.maxMP ) {
    RHeroStatus.MP = RHeroStatus.maxMP;
    $('.right-hero .mana .current-value').html(RHeroStatus.MP)
  } else {
    $('.right-hero .mana .current-value').html(RHeroStatus.MP);
  }
}

function initPassiveSkill(currentHero, enemyHero) {
  $.each(currentHero.classBonus, function(outerKey, outerValue) {
    if ( outerValue > 0 ) {
      switch ( outerKey ) {
        case 'HPRestore':
          currentHero.HP += outerValue;
          break;

        case 'MPRestore':
          currentHero.MP += outerValue;
          break;

        case 'PDIncrease':
          calcBattleParam(currentHero);
          currentHero.PD += Math.round(currentHero.PD * outerValue / 100);
          break;

        case 'MDIncrease':
          calcBattleParam(currentHero);
          currentHero.MD += Math.round(currentHero.MD * outerValue / 100);
          break;

        case 'PDReduction':
          currentHero.passivePDR = {
            value: Math.round(enemyHero.PD * outerValue / 100)
          };
          break;

        case 'MDReduction':
          this.passiveMDR = {
            value: Math.round(enemyHero.MD * outerValue / 100)
          };
          break;
      }
    }
  });
}

//TODO: Сделать везде проверку на летальный урон!
//TODO: Сделать учет всех сопротивлений! (Доделать) [Остановился здесь!]

function initActiveSkill(currentHero, enemyHero) {
  var currentSkill = this;

  $.each(currentSkill, function(outerKey, outerValue) {
    if ( outerValue > 0 || typeof outerValue === 'object' ) {
      switch ( outerKey ) {
        case 'manaCost':
          currentHero.MP -= outerValue;

          alterationInterface();
          break;

        case 'HPRestoreScale':
          currentHero.HP += Math.round(outerValue * currentHero.MD / 100);

          if ( currentHero.HP > currentHero.maxHP ) currentHero.HP = currentHero.maxHP;

          var HPRestore = {
            logName: 'HPRestore',
            heroName: currentHero.name,
            skillName: currentSkill.name,
            value: Math.round(outerValue * currentHero.MD / 100)
          };

          logInfo(HPRestore);
          alterationInterface();
          break;

        case 'MPRestoreScale':
          currentHero.MP += Math.round(outerValue * currentHero.MD / 100);

          if ( currentHero.MP > currentHero.maxMP ) currentHero.MP = currentHero.maxMP;

          var MPRestore = {
            logName: 'HPRestore',
            heroName: currentHero.name,
            skillName: currentSkill.name,
            value: Math.round(outerValue * currentHero.MD / 100)
          };

          logInfo(MPRestore);
          alterationInterface();
          break;

        case 'PDScale':
          if ( enemyHero.HP < Math.round(outerValue * currentHero.PD / 100) ) {
            enemyHero.HP = 0;

            alterationInterface();
            enemyDefeat(currentHero, enemyHero);
          } else {
            enemyHero.HP -= Math.round(outerValue * currentHero.PD / 100);

            var skillPD = {
              logName: 'skillPD',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              dealDamage: Math.round(outerValue * currentHero.PD / 100)
            };

            logInfo(skillPD);
            alterationInterface();
          }
          break;

        case 'MDScale':
          if ( enemyHero.HP < Math.round(outerValue * currentHero.MD / 100) ) {
            enemyHero.HP = 0;

            alterationInterface();
            enemyDefeat(currentHero, enemyHero);
          } else {
            enemyHero.HP -= Math.round(outerValue * currentHero.MD / 100);

            var skillMD = {
              logName: 'skillMD',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              dealDamage: Math.round(outerValue * currentHero.MD / 100)
            };

            logInfo(skillMD);
            alterationInterface();
          }
          break;

        case 'periodicPD':
          if ( outerValue.scale > 0 ) {
            enemyHero.perPDEffect = {
              dealDamage: Math.round(outerValue.scale * currentHero.PD / 100),
              duration: turnQuantity + outerValue.duration
            };

            var overlayPerPD = {
              logName: 'overlayPerPD',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              dealDamage: Math.round(outerValue.scale * currentHero.PD / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(overlayPerPD);
          }
          break;

        case 'periodicMD':
          if ( outerValue.scale > 0 ) {
            enemyHero.perMDEffect = {
              dealDamage: Math.round(outerValue.scale * currentHero.MD / 100),
              duration: turnQuantity + outerValue.duration
            };

            var overlayPerMD = {
              logName: 'overlayPerMD',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              dealDamage: Math.round(outerValue.scale * currentHero.MD / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(overlayPerMD);
          }
          break;

        case 'PDIncrease':
          if ( outerValue.value > 0 ) {
            currentHero.perPDIncrease = {
              value: Math.round(currentHero.PD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            var heroPDIncrease = {
              logName: 'heroPDIncrease',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              value: Math.round(currentHero.PD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(heroPDIncrease);
          }
          break;

        case 'MDIncrease':
          if ( outerValue.value > 0 ) {
            currentHero.perMDIncrease = {
              value: Math.round(currentHero.MD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            var heroMDIncrease = {
              logName: 'heroMDIncrease',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              value: Math.round(currentHero.MD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(heroMDIncrease);
          }
          break;

        case 'PDReduction':
          if ( outerValue.value > 0 ) {
            currentHero.perPDReduction = {
              value: Math.round(enemyHero.PD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            var heroPDReduction = {
              logName: 'heroPDReduction',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              value: Math.round(enemyHero.PD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(heroPDReduction);
          }
          break;

        case 'MDReduction':
          if ( outerValue.value > 0 ) {
            currentHero.MDReduction = {
              value: Math.round(enemyHero.MD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            var heroMDReduction = {
              logName: 'heroMDReduction',
              heroName: currentHero.name,
              skillName: currentSkill.name,
              value: Math.round(enemyHero.MD * outerValue.value / 100),
              duration: turnQuantity + outerValue.duration
            };

            logInfo(heroMDReduction);
          }
          break;

        case 'parametersIncrease':
          $.each(outerValue, function(innerKey, innerValue) {
            if ( innerValue.value ) {
              currentHero.perParamInc = {
                paramIncName: innerKey,
                value: innerValue.value,
                duration: turnQuantity + innerValue.duration
              };

              var heroParamIncrease = {
                logName: 'heroParamIncrease',
                heroName: currentHero.name,
                skillName: currentSkill.name,
                paramName: innerKey,
                value: innerValue.value,
                duration: turnQuantity + innerValue.duration
              };

              logInfo(heroParamIncrease);
            }
          });
          break;
      }
    }
  });
}

function enemyDefeat(currentHero, enemyHero) {
  var defeatLog = {
    logName: 'defeatLog',
    currentHeroName: currentHero.name,
    enemyHeroName: enemyHero.name
  };

  logInfo(defeatLog);
}

function observePerSkill(currentHero) {
  $.each(this, function(outerKey) {
    switch ( outerKey ) {
      case 'HPBan':
        var HPBan = {
          logName: 'HPBan',
          heroName: currentHero.name
        };

        logInfo(HPBan);
        break;

      case 'MPBan':
        var MPBan = {
          logName: 'MPBan',
          heroName: currentHero.name
        };

        logInfo(MPBan);
        break;

      case 'perPDEffect':
        if ( turnQuantity > outerKey.duration ) {
          delete currentHero[outerKey];
        } else if ( turnQuantity <= outerKey.duration ) {
          currentHero.HP -= outerKey.dealDamage;
          alterationInterface();
        }
        break;

      case 'perMDEffect':
        if ( turnQuantity > outerKey.duration ) {
          delete currentHero[outerKey];
        } else if ( turnQuantity <= outerKey.duration ) {
          currentHero.HP -= outerKey.dealDamage;
          alterationInterface();
        }
        break;

      case 'perPDIncrease':
      case 'perMDIncrease':
      case 'perPDReduction':
      case 'perMDReduction':
        if ( turnQuantity > outerKey.duration ) delete currentHero[outerKey];
        /*
          perMDReduction расчитыавется в MDScale
          Остальные эффекты расчитываются в Attack
        */
        break;

        //TODO: Показатели не увеличиваются
      case 'perParamInc':
        console.log(currentHero.perParamInc.paramIncName);
        if ( turnQuantity > outerKey.duration ) {
          delete currentHero[outerKey];
        } else if ( turnQuantity <= outerKey.duration ) {
          currentHero[currentHero.perParamInc.paramIncName] += currentHero.perParamInc.value;
          calcBattleParam(currentHero);
        }
        break;
    }
  });
}

//Вызывается всякий раз, когда герой использует способность, изменяющую его характеристики
function calcBattleParam(currentHero) {
  //Смотря на название класса - скалируем и вписываем боевые параметры
  //Расчет можно найти по данному пути: ../docs/characteristics.txt
  switch ( currentHero.class ) {
    case 'Barbarian':
      currentHero.PD = currentHero.agility * 2 + currentHero.strength;
      currentHero.MD = currentHero.intelligence;
      currentHero.BD = currentHero.defense * 2;
      break;

    case 'Death Knight':
    case 'Warrior':
      currentHero.PD = currentHero.strength * 2 + currentHero.agility;
      currentHero.MD = currentHero.intelligence;
      currentHero.BD = currentHero.defense * 2;
      break;

    case 'Wizard':
    case 'Paladin':
    case 'Warlock':
      currentHero.PD = currentHero.strength + currentHero.agility;
      currentHero.MD = currentHero.intelligence * 3;
      currentHero.BD = currentHero.defense * 2;
      break;
  }
}

function logInfo(logObj) {
  var consoleInterface = $('section.arena #console'),
      consoleMessage,
      separationLine = '';

  for ( var i = 0; i < 88; i++ ) separationLine += '-';

  $.each(logObj, function(outerKey, outerValue) {
    switch ( outerValue ) {
      case 'newTurn':
        consoleMessage = consoleInterface.html();
        consoleMessage += 'Round ' + logObj.turnNum + ' begin' + '<br>' +
                           logObj.currentHero + ' turn' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'attackResult':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.currentHeroName + ' deal ' + logObj.dealDamage + ' DMG' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'moveSkip':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.currentHeroName + ' skip his move' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'currentHeroHP':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' use a health potion' + '<br>' +
                          'Current HP: ' + logObj.heroHP + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'currentHeroMP':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' use a mana potion' + '<br>' +
                          'Current MP: ' + logObj.heroMP + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'banHPPotion':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' has the maximum HP' + '<br>' +
                          'He does not need to drink a potion' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'banMPPotion':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' has the maximum MP' + '<br>' +
                          'He does not need to drink a potion' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'HPBan':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' can no longer use a health potion' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'MPBan':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' can no longer use a mana potion' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'notEnoughManaFS':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' not enough MP to use ' + logObj.skillName +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'notEnoughManaSS':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' not enough MP to use ' + logObj.skillName +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'HPRestore':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' restore ' + logObj.value + ' HP ' + '(' + logObj.skillName + ')' +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'MPRestore':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' restore ' + logObj.value + ' MP ' + '(' + logObj.skillName + ')' +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'skillPD':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' deal ' + logObj.dealDamage + ' damage ' + '(' + logObj.skillName + ')'
                          + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'skillMD':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' deal ' + logObj.dealDamage + ' damage ' + '(' + logObj.skillName + ')'
                          + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'overlayPerPD':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used  ' + logObj.skillName + '<br>' +
                          'Until the ' + logObj.duration + ' move, enemy will receive ' + logObj.dealDamage +
                          ' damage each turn' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'overlayPerMD':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used  ' + logObj.skillName + '<br>' +
                          'Until the ' + logObj.duration + ' move, enemy will receive ' + logObj.dealDamage +
                          ' damage each turn' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'heroPDIncrease':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used ' + logObj.skillName + '<br>' +
                          'Physical damage increased by ' + logObj.value + ' for ' + logObj.duration + ' moves' +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'heroMDIncrease':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used ' + logObj.skillName + '<br>' +
                          'Magic damage increased by ' + logObj.value + ' for ' + logObj.duration + ' moves' +
                          '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'heroPDReduction':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used ' + logObj.skillName + '<br>' +
                          'Resulting physical damage is reduced by ' + logObj.value + ' for ' + logObj.duration +
                          ' moves' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'heroMDReduction':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used ' + logObj.skillName + '<br>' +
                          'Resulting madic damage is reduced by ' + logObj.value + ' for ' + logObj.duration +
                          ' moves' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;

      case 'heroParamIncrease':
        consoleMessage = consoleInterface.html();
        consoleMessage += logObj.heroName + ' used ' + logObj.skillName + '<br>' +
                          logObj.paramName + ' increased by ' + logObj.value + ' for ' + logObj.duration +
                          ' moves' + '<br>' + separationLine;
        consoleInterface.html(consoleMessage + '<br>');
        clearConsole(consoleInterface);
        break;
    }
  });
}

function clearConsole(consoleInterface) {
  var counter = 0,
      position = consoleInterface.html().indexOf('<br>');

  while (position !== -1) {
    counter++;
    position = consoleInterface.html().indexOf('<br>', position + 1);

    if ( counter > 22 ) {
      setTimeout(function() {
        consoleInterface.empty();
      }, 1000);
    }
  }
}

function createEasyAI() {
  var randomSpell = Math.floor(Math.random() * 5);

  setTimeout(function() {
    $('.right-hero .action-bar img').each(function(index, element) {
      if ( index === randomSpell ) $(element).click();
    });
    initTurn();
  }, 2000);
}

/*function createMediumAI() {
  
}

function createHardAI() {
  
}*/

//Заполняем таблицы со сведениями о персонажах (listOfHeroes.html)
function initTables() {
  //Объявляем переменные-массивы
  var setValues = [], calcValues = [];

  //Заполняем первый массив, таблицами с установленными значениями
  $('.set-values').each(function(index, element) {
    setValues.push(element);
  });

  //Заполняем второй массив, таблицами с расчетным значениями
  $('.calc-values').each(function(index, element) {
    calcValues.push(element);
  });

  //Устанавливаем имена персонажей, перебирая все h3
  $('h3').each(function(index, element) {
    $(element).html(charInfo[index].name);
  });

  //Устанавливаем титулы перслнажей, перебирая все p.title
  $('p.title').each(function(index, element) {
    $(element).html(charInfo[index].title);
  });

  //Устанавливаем значения в таблицы, перебирая все div
  $('div').each(function(index) {
    //Заполняем первую таблицу (Установленные значения)
    $(setValues[index].rows[0].cells[1]).html(charInfo[index].class);
    $(setValues[index].rows[1].cells[1]).html(charInfo[index].level);
    $(setValues[index].rows[2].cells[1]).html(charInfo[index].strength);
    $(setValues[index].rows[3].cells[1]).html(charInfo[index].agility);
    $(setValues[index].rows[4].cells[1]).html(charInfo[index].intelligence);
    $(setValues[index].rows[5].cells[1]).html(charInfo[index].stamina);
    $(setValues[index].rows[6].cells[1]).html(charInfo[index].defense);

    //Заполняем вторую таблицу (Расчетные значения)
    $(calcValues[index].rows[0].cells[1]).html(charInfo[index].HP);
    $(calcValues[index].rows[1].cells[1]).html(charInfo[index].MP);
    $(calcValues[index].rows[2].cells[1]).html(charInfo[index].PD);
    $(calcValues[index].rows[3].cells[1]).html(charInfo[index].MD);
    $(calcValues[index].rows[4].cells[1]).html(charInfo[index].BD);
  });
}

/*
  Устанавливаем обработчики на всех персонажей (listOfHeroes.html)
  Обработчик открывает страницу с полной информацией о выбранном персонаже
*/
function initHandlers() {
  gameContent.on('click', 'div', function() {
    switch ( $(this).attr('id') ) {
      case 'barbarian-description':
        gameContent.load('../characterInfo.html .barbarian');
        break;
      case 'death-knight-description':
        gameContent.load('../characterInfo.html .death-knight');
        break;
      case 'wizard-description':
        gameContent.load('../characterInfo.html .wizard');
        break;
      case 'warrior-description':
        gameContent.load('../characterInfo.html .warrior');
        break;
      case 'paladin-description':
        gameContent.load('../characterInfo.html .paladin');
        break;
      case 'warlock-description':
        gameContent.load('../characterInfo.html .warlock');
        break;
    }
  });
}