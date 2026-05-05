'use strict';

interface Message {
  title: string;
  body: string;
}

const MORNING_MESSAGES: Message[] = [
  { title: '☀️ Good morning!', body: 'Ready to tackle your {total} tasks today?' },
  { title: '☕ Rise and shine!', body: "You've got {total} things on your list. Let's get started!" },
  { title: '🌅 Morning check-in', body: 'A fresh day! You have {total} tasks planned.' },
  { title: '🌤️ Hello there!', body: 'A new day begins. You have {total} goals to reach.' },
  { title: '✨ Fresh start', body: 'Let\'s make today productive! {total} tasks are waiting.' },
  { title: '🔋 Fully charged?', body: 'Ready to power through your {total} tasks today?' },
  { title: '🚀 Launching today', body: 'Ignition on! You have {total} missions to complete.' },
  { title: '📅 Today\'s agenda', body: 'Checking in on your {total} planned tasks for the day.' },
  { title: '💪 You got this!', body: 'A brand new morning. Let\'s conquer these {total} tasks.' },
  { title: '🧘 Focus time', body: 'Center yourself. You have {total} tasks to focus on today.' },
  { title: '🏃 Step by step', body: 'Start your day right by looking at your {total} tasks.' },
  { title: '🌟 Shine bright', body: 'Make today count! You have {total} opportunities on your list.' },
];

const AFTERNOON_MESSAGES: Message[] = [
  { title: '🌗 Halfway through!', body: 'How are those {remaining} tasks coming along?' },
  { title: '☀️ Afternoon check-in', body: '{done}/{total} tasks finished. Keep up the momentum!' },
  { title: '🕒 Time for a break?', body: "You've finished {done} tasks. {remaining} more to go!" },
  { title: '📈 Progress report', body: 'You are moving! {done} done, {remaining} remaining.' },
  { title: '🥤 Quick refresh?', body: 'Take a sip of water and tackle the next of your {remaining} tasks.' },
  { title: '🏁 The home stretch', body: 'The afternoon is here. {remaining} more tasks to cross off!' },
  { title: '⚡ Power hour', body: 'Let\'s use this energy to finish your {remaining} remaining tasks.' },
  { title: '🧐 Review time', body: 'Half the day is gone. You\'ve cleared {done} tasks so far.' },
  { title: '🚂 Full steam ahead', body: 'Don\'t slow down now! {remaining} tasks left on the track.' },
  { title: '🏔️ Reaching the peak', body: 'You\'ve climbed through {done} tasks. Keep going for the rest!' },
  { title: '🌤️ Afternoon glow', body: 'Making good progress! {done}/{total} tasks are history.' },
  { title: '✅ Checking in', body: 'Just a quick nudge for your {remaining} outstanding tasks.' },
];

const EVENING_MESSAGES: Message[] = [
  { title: '🌇 Wrapping up?', body: 'You still have {remaining} tasks left for today.' },
  { title: '🌙 Evening check-in', body: 'Almost done! Just {remaining} more tasks to clear.' },
  { title: '🏠 Heading out?', body: "Don't forget your {remaining} remaining tasks!" },
  { title: '🌆 Sunset review', body: 'The day is winding down. {remaining} tasks still active.' },
  { title: '🕯️ Final push', body: 'Just a few more! Can you finish these {remaining} tasks?' },
  { title: '🌌 Starlit goals', body: 'Before you finish for the day, check your {remaining} tasks.' },
  { title: '🛌 Nearly bedtime', body: 'Want to clear those {remaining} tasks before resting?' },
  { title: '🍵 Calm evening', body: 'Finish strong! You have {remaining} tasks left to do.' },
  { title: '📉 Tying loose ends', body: 'Let\'s close out those last {remaining} items on your list.' },
  { title: '🕰️ Late check-in', body: 'Still working? You have {remaining} tasks remaining.' },
  { title: '🚶 One last walk-through', body: 'Reviewing your day: {remaining} tasks left to go.' },
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
  { title: '🌌 Space for rest', body: 'No more tasks! Your evening is officially yours.' },
  { title: '🚀 Mission complete', body: 'All objectives met. Returning to base for rest.' },
  { title: '🎨 Masterpiece', body: 'A beautifully completed day. Nothing left to do!' },
];

const NO_PROGRESS_MESSAGES: Message[] = [
  { title: '🚀 Ready to start?', body: "Haven't started your {total} tasks yet? Pick one and go!" },
  { title: '💡 Small steps', body: 'The hardest part is starting. Let\'s check one task off!' },
  { title: '🌱 Time to plant', body: 'Your {total} tasks are waiting to grow. Start one now!' },
  { title: '🧊 Break the ice', body: 'The list looks daunting? Just start with the easiest of {total}.' },
  { title: '⚡ Spark needed?', body: 'Let\'s get moving! {total} tasks are waiting for you.' },
  { title: '🛤️ On the tracks', body: 'Get the train moving! Your {total} tasks are ready.' },
  { title: '⏱️ The clock is ticking', body: 'The day is moving along. Ready to start your {total} tasks?' },
  { title: '🪁 Take flight', body: 'Get your day off the ground. {total} tasks to tackle.' },
  { title: '🧗 Start the climb', body: 'First step is the most important. {total} tasks ahead.' },
  { title: '🔑 Unlock progress', body: 'Start your first task to unlock a productive day!' },
  { title: '🌊 Catch the wave', body: 'Don\'t let the day pass you by. {total} tasks waiting.' },
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
  const isFirstFire = hour <= 9; // Assuming workStart is around 8-9

  if (isMonday && isFirstFire) {
    return { ...MONDAY_MORNING, mode: 'planner' };
  }

  let msg: Message;

  if (totalTasks === 0) {
    msg = { title: '☀️ Daily check-in', body: 'No tasks for today. Want to add some?' };
  } else if (remaining === 0) {
    msg = getRandom(ALL_DONE_MESSAGES);
  } else if (doneTasks === 0 && hour > 10) {
    msg = getRandom(NO_PROGRESS_MESSAGES);
  } else if (hour < 12) {
    msg = getRandom(MORNING_MESSAGES);
  } else if (hour < 17) {
    msg = getRandom(AFTERNOON_MESSAGES);
  } else {
    msg = getRandom(EVENING_MESSAGES);
  }

  const body = msg.body
    .replace('{total}', String(totalTasks))
    .replace('{done}', String(doneTasks))
    .replace('{remaining}', String(remaining));

  return { title: msg.title, body, mode: 'checkin' };
}
