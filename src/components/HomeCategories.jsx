import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Camera, Music, Film, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const categories = [
  {
    id: 'events',
    path: '/events',
    icon: Calendar,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
    color: 'from-red-500/80 to-orange-600/80',
    delay: 0.05
  },
  {
    id: 'gallery',
    path: '/gallery',
    icon: Camera,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    color: 'from-purple-500/80 to-indigo-600/80',
    delay: 0.1
  },
  {
    id: 'music',
    path: '/music',
    icon: Music,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    color: 'from-cyan-500/80 to-blue-600/80',
    delay: 0.15
  },
  {
    id: 'videos',
    path: '/videos',
    icon: Film,
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
    color: 'from-pink-500/80 to-rose-600/80',
    delay: 0.2
  },
  {
    id: 'articles',
    path: '/articles',
    icon: BookOpen,
    image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
    color: 'from-emerald-500/80 to-teal-600/80',
    delay: 0.25
  }
];

const CategoryCard = ({ item }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 20
          }
        }
      }}
      whileHover={{ y: -15, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative group h-[400px] w-full overflow-hidden rounded-[2rem] cursor-pointer border border-white/10 shadow-2xl bg-black/40 backdrop-blur-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/20"
    >
      <Link to={item.path} className="block w-full h-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={item.image} 
            alt={t(`nav.${item.id}`)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.5] group-hover:grayscale-0"
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 group-hover:opacity-60 transition-opacity duration-500 mix-blend-overlay`} />
        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl`} />
        
        {/* Dark Gradient for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

        {/* Glass Reflection Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            {/* Icon */}
            <div className="mb-4 inline-block p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300">
              <item.icon size={32} strokeWidth={1.5} className="drop-shadow-lg" />
            </div>

            {/* Title */}
            <h3 className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2 tracking-tight group-hover:to-white transition-all">
              {t(`nav.${item.id}`)}
            </h3>

            {/* Description (Static for now, could be dynamic or translated) */}
            <p className="text-gray-300 mb-6 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform translate-y-2 group-hover:translate-y-0">
              {t(`home.categories.${item.id}_desc`)}
            </p>

            {/* Action Button */}
            <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-sm">
              <span>{t('common.explore')}</span>
              <ArrowRight size={16} className="transform group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </div>
        </div>

        {/* Decorative Border */}
        <div className="absolute inset-0 border border-white/10 rounded-3xl group-hover:border-white/30 transition-colors duration-500 pointer-events-none" />
      </Link>
    </motion.div>
  );
};

const HomeCategories = () => {
  const { t } = useTranslation();
  return (
    <section className="py-24 px-4 md:px-8 bg-black relative z-10">
      <div className="max-w-[1800px] mx-auto">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-serif text-white mb-4">
            {t('home.discover')}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto" />
        </motion.div>

        {/* Grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {categories.map((category) => (
            <CategoryCard key={category.id} item={category} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HomeCategories;
