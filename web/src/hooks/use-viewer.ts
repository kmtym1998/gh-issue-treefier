import { useEffect, useState } from "react";
import { graphql } from "../api-client";

interface ViewerResponse {
  data: { viewer: { login: string } };
}

export const useViewer = () => {
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    graphql<ViewerResponse>("{ viewer { login } }")
      .then((res) => setLogin(res.data.viewer.login))
      .catch(() => {});
  }, []);

  return { login };
};
