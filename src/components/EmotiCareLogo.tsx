
import React from "react";
import { HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";

const EmotiCareLogo = () => {
  return (
    <Link to="/" className="flex items-center gap-2">
      <HeartPulse className="h-8 w-8 text-purple-600" />
      <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
        EmotiCare
      </span>
    </Link>
  );
};

export default EmotiCareLogo;
