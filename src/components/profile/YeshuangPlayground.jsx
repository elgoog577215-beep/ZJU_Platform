import { memo, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ChevronDown, Heart, Moon, Pause, Play, Snowflake, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motionTokens, useReducedMotion } from "../../utils/animations";
import "./YeshuangPlayground.css";

const ASSET_ROOT = "/images/profiles/yeshuang";
const SCENES = ["moon", "midnight", "silver"];
const MOODS = ["peek", "pat", "heart", "study", "sleepy"];

// Visual-only customization, scoped to the verified production profile and owner.
// Do not use display names or search aliases to decide who receives this treatment.
const YeshuangPlayground = ({ isDayMode }) => {
    const { t, i18n } = useTranslation();
    const reducedMotion = useReducedMotion();
    const [scene, setScene] = useState("moon");
    const [mood, setMood] = useState(0);
    const [paused, setPaused] = useState(false);
    const [snowing, setSnowing] = useState(false);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [discovered, setDiscovered] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const touches = useRef(0);
    const snowTimer = useRef(null);
    const tiltX = useMotionValue(0);
    const tiltY = useMotionValue(0);
    const rotateX = useSpring(tiltX, motionTokens.spring.gentle);
    const rotateY = useSpring(tiltY, motionTokens.spring.gentle);
    const animated = !reducedMotion && !paused;
    const text = (key, options) => t(`profiles.yeshuang.${key}`, options);

    useEffect(() => () => clearTimeout(snowTimer.current), []);
    useEffect(() => {
        if (!animated) {
            tiltX.set(0);
            tiltY.set(0);
            setSnowing(false);
            clearTimeout(snowTimer.current);
        }
    }, [animated, tiltX, tiltY]);

    const makeSnow = () => {
        setAnnouncement(text("snow_message"));
        if (!animated || snowing) return;
        setSnowing(true);
        clearTimeout(snowTimer.current);
        snowTimer.current = setTimeout(() => setSnowing(false), 3200);
    };

    const touchCharacter = () => {
        const nextMood = (mood + 1) % MOODS.length;
        setMood(nextMood);
        touches.current += 1;
        if (touches.current === 5) {
            setMood(MOODS.indexOf("heart"));
            setDiscovered(true);
            makeSnow();
            setAnnouncement(text("secret"));
        } else {
            setAnnouncement(text(`moods.${MOODS[nextMood]}.message`));
        }
    };

    const trackPointer = (event) => {
        if (!animated || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        tiltX.set((0.5 - (event.clientY - rect.top) / rect.height) * 9);
        tiltY.set(((event.clientX - rect.left) / rect.width - 0.5) * 9);
    };

    return (
        <div
            className="yeshuang-world"
            data-theme={isDayMode ? "day" : "dark"}
            data-animated={animated}
            data-testid="yeshuang-playground"
            lang={i18n.resolvedLanguage || i18n.language}
        >
            <div className="ys-stage">
                <div className="ys-scene" aria-hidden="true">
                    <img
                        key={scene}
                        src={`${ASSET_ROOT}/${scene}.webp`}
                        alt=""
                        width={1440}
                        height={scene === "moon" ? 810 : 960}
                        className={`ys-scene-image ys-scene-image--${scene}`}
                        fetchPriority="high"
                    />
                </div>

                <div className="ys-intro">
                    <span className="ys-eyebrow">YESHUANG’S LITTLE WORLD</span>
                    <h2 className="ys-title">{text("name")}</h2>
                    <p className="ys-welcome">{text("welcome")}</p>
                    <p className="ys-description">{text("description")}</p>
                    <div className="ys-controls">
                        <button
                            type="button"
                            onClick={makeSnow}
                            className="ys-button ys-button-primary"
                        >
                            <Snowflake size={17} aria-hidden="true" />
                            {text("snow")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setGalleryOpen((value) => !value)}
                            className="ys-button"
                            aria-expanded={galleryOpen}
                            aria-controls="yeshuang-gallery"
                        >
                            {text("gallery")}
                            <ChevronDown
                                size={16}
                                className={galleryOpen ? "ys-flipped" : ""}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                    <span className="ys-invitation">
                        <Sparkles size={14} aria-hidden="true" />
                        {text("invitation")}
                    </span>
                </div>

                <div className="ys-stage-toolbar">
                    <span className="ys-scene-label">
                        <Moon size={14} aria-hidden="true" />
                        {text(`scenes.${scene}`)}
                    </span>
                    {!reducedMotion && (
                        <button
                            type="button"
                            className="ys-motion-toggle"
                            onClick={() => setPaused((value) => !value)}
                            aria-label={text(paused ? "resume" : "pause")}
                            title={text(paused ? "resume" : "pause")}
                            aria-pressed={paused}
                        >
                            {paused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                    )}
                </div>

                <div className="ys-sticker-wrap">
                    <motion.button
                        type="button"
                        className="ys-sticker"
                        onClick={touchCharacter}
                        onPointerMove={trackPointer}
                        onPointerLeave={() => {
                            tiltX.set(0);
                            tiltY.set(0);
                        }}
                        style={{ rotateX: animated ? rotateX : 0, rotateY: animated ? rotateY : 0 }}
                        whileTap={animated ? { scale: 0.95 } : undefined}
                        aria-label={text("touch")}
                        aria-describedby="yeshuang-mood"
                    >
                        <img
                            src={`${ASSET_ROOT}/${MOODS[mood]}.webp`}
                            alt={text(`moods.${MOODS[mood]}.label`)}
                            width="400"
                            height="400"
                        />
                        <span>
                            <Heart size={12} aria-hidden="true" />
                            {text("touch_hint")}
                        </span>
                    </motion.button>
                    <span id="yeshuang-mood" className="ys-mood-caption">
                        {text(`moods.${MOODS[mood]}.message`)}
                    </span>
                </div>

                {snowing && animated && (
                    <div className="ys-snow" aria-hidden="true" data-testid="yeshuang-snow">
                        {Array.from({ length: 26 }, (_, index) => (
                            <i
                                key={index}
                                style={{
                                    "--x": `${(index * 37) % 101}%`,
                                    "--delay": `${(index % 7) * 0.12}s`,
                                    "--size": `${3 + (index % 4) * 2}px`,
                                    "--drift": `${(index % 2 ? 1 : -1) * (20 + index * 2)}px`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="ys-bottom-bar">
                <div className="ys-scene-switcher" role="group" aria-label={text("choose_scene")}>
                    {SCENES.slice(0, 3).map((name) => (
                        <button
                            type="button"
                            key={name}
                            onClick={() => setScene(name)}
                            aria-pressed={scene === name}
                        >
                            <span className="ys-scene-dot" aria-hidden="true" />
                            {text(`scenes.${name}`)}
                        </button>
                    ))}
                </div>
                <span className="ys-secret-hint">
                    {discovered ? text("secret_badge") : text("secret_hint")}
                </span>
            </div>
            <p className="ys-announcement" role="status" aria-live="polite" aria-atomic="true">
                {announcement}
            </p>

            <div id="yeshuang-gallery" hidden={!galleryOpen} className="ys-gallery">
                <div className="ys-gallery-heading">
                    <h3>{text("gallery_title")}</h3>
                    <p>{text("gallery_hint")}</p>
                </div>
                <div className="ys-gallery-grid">
                    {SCENES.map((name) => (
                        <button
                            type="button"
                            key={name}
                            onClick={() => setScene(name)}
                            aria-pressed={scene === name}
                        >
                            <img
                                src={`${ASSET_ROOT}/${name}.webp`}
                                alt={text(`art_alt.${name}`)}
                                loading="lazy"
                                width="360"
                                height="270"
                            />
                            <span>{text(`scenes.${name}`)}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(YeshuangPlayground);
