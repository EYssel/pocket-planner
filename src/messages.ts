'use strict';

interface Message {
  title: string;
  body: string;
}

const EARLY_MORNING_MESSAGES: Message[] = [
  { title: '☀️ Good morning!', body: 'Ready to tackle your {total} tasks today?' },
  { title: '☕ Rise and shine!', body: "You've got {total} things on your list. Let's get started!" },
  { title: '🌅 Morning check-in', body: 'A fresh day! You have {total} tasks planned.' },
  { title: '🌤️ Hello there!', body: 'A new day begins. You have {total} goals to reach.' },
  { title: '✨ Fresh start', body: 'Let\'s make today productive! {total} tasks are waiting.' },
  { title: '🔋 Fully charged?', body: 'Ready to power through your {total} tasks today?' },
  { title: '🚀 Launching today', body: 'Ignition on! You have {total} missions to complete.' },
  { title: '💪 You got this!', body: 'A brand new morning. Let\'s conquer these {total} tasks.' },
];

const MID_MORNING_MESSAGES: Message[] = [
  { title: '🕒 Mid-morning focus', body: 'Almost midday! How are those {total} tasks coming along?' },
  { title: '📈 Building momentum', body: "You've finished {done} tasks already. Keep going!" },
  { title: '☕ Coffee break?', body: 'Take a breather, then dive back into your {remaining} remaining tasks.' },
  { title: '🧘 Focus time', body: 'Center yourself. You have {remaining} tasks to focus on before lunch.' },
  { title: '🏃 Step by step', body: 'Keep the rhythm! {done}/{total} tasks are already checked off.' },
  { title: '🌟 Shine bright', body: 'You are doing great! {remaining} tasks to go before the lunch bell.' },
  { title: '🚂 Full steam ahead', body: 'Mid-morning energy! Let\'s clear more of your {total} tasks.' },
  { title: '⚖️ Balancing act', body: 'Checking in on your progress: {done} done, {remaining} to go!' },
];

const EARLY_AFTERNOON_MESSAGES: Message[] = [
  { title: '🌗 Afternoon check-in', body: '{done}/{total} tasks finished. Keep up the momentum!' },
  { title: '🥤 Quick refresh?', body: 'Take a sip of water and tackle the next of your {remaining} tasks.' },
  { title: '⛰️ Halfway there!', body: 'You are moving! {done} done, {remaining} remaining.' },
  { title: '⚡ Power hour', body: 'Let\'s use this afternoon energy to finish your {remaining} tasks.' },
  { title: '🧐 Review time', body: 'Half the day is gone. You\'ve cleared {done} tasks so far.' },
  { title: '🏔️ Reaching the peak', body: 'You\'ve climbed through {done} tasks. Keep going for the rest!' },
  { title: '🌤️ Afternoon glow', body: 'Making good progress! {done}/{total} tasks are history.' },
  { title: '✅ Checking in', body: 'Just a quick nudge for your {remaining} outstanding tasks.' },
];

const LATE_AFTERNOON_MESSAGES: Message[] = [
  { title: '🏁 The home stretch', body: 'The day is winding down. {remaining} more tasks to cross off!' },
  { title: '⚡ Power hour', body: 'Let\'s use this energy to finish your {remaining} remaining tasks.' },
  { title: '🏃 Sprint finish', body: 'Almost there! Can you clear these last {remaining} items?' },
  { title: '🌇 Sunset sprint', body: 'Before the sun goes down, let\'s tackle these {remaining} tasks.' },
  { title: '📉 Tying loose ends', body: 'Let\'s close out those last {remaining} items on your list.' },
  { title: '🕰️ Late check-in', body: 'Still working? You have {remaining} tasks remaining.' },
  { title: '🚶 One last walk-through', body: 'Reviewing your day: {remaining} tasks left to go.' },
  { title: '🕯️ Final push', body: 'Just a few more! Can you finish these {remaining} tasks?' },
];

const EVENING_MESSAGES: Message[] = [
  { title: '🌇 Wrapping up?', body: 'You still have {remaining} tasks left for today.' },
  { title: '🌙 Evening review', body: 'The day is nearly over. {remaining} tasks still active.' },
  { title: '🏠 Ready for rest?', body: "Don't forget your {remaining} remaining tasks before you finish!" },
  { title: '🌆 Sunset review', body: 'The day is winding down. {remaining} tasks still active.' },
  { title: '🌌 Starlit goals', body: 'Before you finish for the day, check your {remaining} tasks.' },
  { title: '🛌 Nearly bedtime', body: 'Want to clear those {remaining} tasks before resting?' },
  { title: '🍵 Calm evening', body: 'Finish strong! You have {remaining} tasks left to do.' },
  { title: '🌑 End of day', body: 'How did it go? You still have {remaining} tasks on the list.' },
];

const ALL_DONE_MESSAGES: Message[] = [
  { title: '🎉 All done!', body: "Amazing! You've cleared your list for today. Enjoy your rest!" },
  { title: '🏆 Productivity master', body: 'Every task is finished. Great job today!' },
  { title: '✅ List cleared', body: 'Zero tasks remaining. You crushed it!' },
  { title: '🎈 Celebration time', body: 'You finished everything! Time to relax and recharge.' },
  { title: '🌟 Perfection!', body: 'A perfect score today. All tasks are completed!' },
  { title: '🥇 Gold star', body: 'You handled everything on your plate. Well done!' },
  { title: '🎊 Victory!', body: 'The list is empty. You\'ve conquered the day!' },
  { title: '🌊 Smooth sailing', body: 'Everything is done. Enjoy the peace of an empty list.' },
  { title: '🔥 On fire!', body: 'You zipped through every single task. Impressive!' },
  { title: '🚀 Mission complete', body: 'All objectives met. Returning to base for rest.' },
];

const NO_PROGRESS_MIDDAY: Message[] = [
  { title: '🚀 Ready to start?', body: "Haven't started your {total} tasks yet? Pick one and go!" },
  { title: '💡 Small steps', body: 'The hardest part is starting. Let\'s check one of your {total} tasks off!' },
  { title: '🌱 Time to plant', body: 'Your {total} tasks are waiting to grow. Start one now!' },
  { title: '🧊 Break the ice', body: 'The list looks daunting? Just start with the easiest of {total}.' },
  { title: '⚡ Spark needed?', body: 'Let\'s get moving! {total} tasks are waiting for you.' },
  { title: '🛤️ On the tracks', body: 'Get the train moving! Your {total} tasks are ready.' },
  { title: '⏱️ The clock is ticking', body: 'The day is moving along. Ready to start your {total} tasks?' },
  { title: '🏁 Starting line', body: 'The race has begun! Ready to jump into your {total} tasks?' },
];

const MONDAY_MORNING: Message = {
  title: '📋 Plan your week',
  body: 'Set your tasks for each day this week.',
};

function getRandom(arr: Message[]): Message {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getDynamicMessage(
  hour: number,
  totalTasks: number,
  doneTasks: number,
  isMonday: boolean
): { title: string; body: string; mode: string } {
  const remaining = totalTasks - doneTasks;
  const isFirstFire = hour <= 9;

  if (isMonday && isFirstFire) {
    return { ...MONDAY_MORNING, mode: 'planner' };
  }

  let msg: Message;

  if (totalTasks === 0) {
    msg = { title: '☀️ Daily check-in', body: 'No tasks for today. Want to add some?' };
  } else if (remaining === 0) {
    msg = getRandom(ALL_DONE_MESSAGES);
  } else if (doneTasks === 0 && hour >= 11) {
    msg = getRandom(NO_PROGRESS_MIDDAY);
  } else if (hour < 10) {
    msg = getRandom(EARLY_MORNING_MESSAGES);
  } else if (hour < 12) {
    msg = getRandom(MID_MORNING_MESSAGES);
  } else if (hour < 15) {
    msg = getRandom(EARLY_AFTERNOON_MESSAGES);
  } else if (hour < 18) {
    msg = getRandom(LATE_AFTERNOON_MESSAGES);
  } else {
    msg = getRandom(EVENING_MESSAGES);
  }

  const body = msg.body
    .replace('{total}', String(totalTasks))
    .replace('{done}', String(doneTasks))
    .replace('{remaining}', String(remaining));

  return { title: msg.title, body, mode: 'checkin' };
}
