type CardProps = {
    title: string;
    description: string;
};

export const Card = ({ title, description }: CardProps) => {
    return (
        <div className="cv:bg-white cv:rounded-lg cv:shadow-lg cv:overflow-hidden sm:max-w-xs lg:max-w-sm xl:max-w-md">
            <div className="cv:px-6 cv:py-4">
                <h2 className="cv:font-sans cv:text-red-700 cv:font-bold cv:text-xl cv:mb-2">{title}</h2>
                <p className="cv:bg-white cv:border-none cv:rounded-none cv:font-sans cv:text-gray-900 cv:text-base">{description}</p>
            </div>
        </div>
    );
};
