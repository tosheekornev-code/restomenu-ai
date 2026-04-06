import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { CategoriesPage } from "./pages/CategoriesPage";
import { PositionsPage } from "./pages/PositionsPage";
import { OptionsGroupsPage } from "./pages/OptionsGroupsPage";
import { StopListPage } from "./pages/StopListPage";
import { GoListPage } from "./pages/GoListPage";
import { GiftsPage } from "./pages/GiftsPage";
import { IngredientsPage } from "./pages/IngredientsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: CategoriesPage },
      { path: "categories", Component: CategoriesPage },
      { path: "positions", Component: PositionsPage },
      { path: "options", Component: OptionsGroupsPage },
      { path: "stoplist", Component: StopListPage },
      { path: "golist", Component: GoListPage },
      { path: "gifts", Component: GiftsPage },
      { path: "ingredients", Component: IngredientsPage },
    ],
  },
]);
