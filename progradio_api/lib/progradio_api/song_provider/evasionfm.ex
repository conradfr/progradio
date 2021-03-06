defmodule ProgRadioApi.SongProvider.Evasionfm do
  require Logger
  alias ProgRadioApi.SongProvider

  @behaviour ProgRadioApi.SongProvider

  @url "https://www.evasionfm.com/XML/morceaux.xml"
  @minutes_max 300
  @timezone "Europe/Paris"

  @impl true
  def has_custom_refresh(), do: false

  @impl true
  def get_refresh(_name, _data, _default_refresh), do: nil

  @impl true
  def get_auto_refresh(_name, _data, default_refresh), do: default_refresh

  @impl true
  def get_data(_name, _last_data) do
    now_unix = SongProvider.now_unix()

    @url
    |> SongProvider.get()
    |> Map.get(:body)
    |> XmlToMap.naive_map()
    |> Map.get("listeMorceaux", %{})
    |> Map.get("morceau", [])
    |> Enum.find(nil, fn e ->
      try do
        time_start =
          e
          |> Map.get("heure")
          |> Timex.parse!("{h24}h{m}")
          |> NaiveDateTime.to_time()
          |> (&DateTime.new!(DateTime.now!(@timezone) |> DateTime.to_date(), &1, @timezone)).()
          |> DateTime.to_unix()

        time_end = time_start + @minutes_max
        now_unix >= time_start and now_unix <= time_end
      rescue
        _ -> nil
      end
    end)
  end

  @impl true
  def get_song(name, data) do
    case data do
      nil ->
        Logger.info("Data provider - #{name}: error fetching song data or empty")
        %{}

      _ ->
        %{artist: SongProvider.recase(data["artiste"]), title: SongProvider.recase(data["titre"])}
    end
  end
end
