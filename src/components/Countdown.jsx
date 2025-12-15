import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const Countdown = ({ targetDate }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (Object.keys(timeLeft).length === 0) {
    return null; // Event started or passed
  }

  return (
    <div className="flex gap-4 mb-6">
      {Object.keys(timeLeft).map((interval) => (
        <div key={interval} className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg backdrop-blur-md">
            {timeLeft[interval]}
          </div>
          <span className="text-xs text-gray-500 uppercase mt-2 font-bold tracking-wider">
            {t(`events.countdown.${interval}`)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;